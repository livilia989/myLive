import { analyzeDecision } from "./analysis";
import { MockLLMProvider } from "./mock/MockLLMProvider";
import { LLMResponseSchema } from "./schemas";
import type {
  ChatMessage,
  DecisionChoice,
  DecisionContext,
  DecisionCriterion,
  DecisionLLMInput,
  DecisionLLMResponse,
  DecisionSession,
  DecisionStage,
  LLMProvider,
} from "./types";
import {
  HIGH_RISK_NOTICE,
  createId,
  createMessage,
  detectHighRisk,
  nowIso,
  slugId,
  softenAssertiveText,
  toQuickReplies,
} from "./utils";

// ─────────────────────────────────────────────────────────────
// 대화 흐름 (Stage Machine)
// LLM 에게 모든 판단을 맡기지 않고, 단계 전환 규칙은 여기서 명확하게 관리한다.
// backend 의 DecisionService 와 frontend 의 브라우저 Mock 모드가 같은 코드를 사용한다.
// ─────────────────────────────────────────────────────────────

export const GREETING_TEXT = "좋아, 오늘 어떤 고민이 있어?";
export const LLM_ERROR_TEXT = "수정구슬이 잠깐 흐려졌어요.\n잠시 후 다시 시도해 주세요.";
export const MAX_QUESTIONS = 7;
export const ACTION_VIEW_RESULT = "action:view_result";
export const ACTION_EDIT_CHOICES = "action:edit_choices";
export const ACTION_NEW_DECISION = "action:new_decision";

export class LLMUnavailableError extends Error {
  constructor(message = "LLM 호출에 실패했습니다.") {
    super(message);
    this.name = "LLMUnavailableError";
  }
}

export function createEmptyContext(category?: string): DecisionContext {
  return {
    category,
    choices: [],
    criteria: [],
    userPreferences: {},
    constraints: [],
    missingInformation: [],
  };
}

export function createDecisionSession(options: { id?: string; title?: string; category?: string } = {}): DecisionSession {
  const now = nowIso();
  return {
    id: options.id ?? createId("dec"),
    title: options.title ?? "새 고민",
    category: options.category,
    stage: "greeting",
    messages: [
      createMessage({
        role: "assistant",
        type: "text",
        content: GREETING_TEXT,
        metadata: { stage: "greeting" },
      }),
    ],
    context: createEmptyContext(options.category),
    createdAt: now,
    updatedAt: now,
  };
}

function touch(session: DecisionSession): DecisionSession {
  return { ...session, updatedAt: nowIso() };
}

function assistant(content: string, stage: DecisionStage, extra: Partial<ChatMessage> = {}): ChatMessage {
  return createMessage({ role: "assistant", type: "text", content, ...extra, metadata: { stage, ...extra.metadata } });
}

function countQuestions(session: DecisionSession): number {
  return session.messages.filter((m) => m.role === "assistant" && m.type === "question").length;
}

/** 답변 안에 질문과 같은 내용의 질문이 이미 있는지 (핵심 단어가 절반 이상 겹치는 물음 문장) */
function alreadyAsks(reply: string, question: string): boolean {
  if (reply.includes(question)) return true;
  const words = (text: string) => new Set(text.replace(/[^가-힣a-z0-9\s]/gi, " ").split(/\s+/).filter((w) => w.length >= 2));
  const target = words(question);
  if (!target.size) return false;
  return reply
    .split(/(?<=[?？])/)
    .filter((sentence) => /[?？]/.test(sentence))
    .some((sentence) => {
      const got = words(sentence);
      const overlap = [...target].filter((w) => [...got].some((g) => g.startsWith(w.slice(0, 2)))).length;
      return overlap / target.size >= 0.5;
    });
}

function sameName(a: string, b: string): boolean {
  return a.replace(/\s+/g, "").toLowerCase() === b.replace(/\s+/g, "").toLowerCase();
}

// ─────────────────────────────────────────────────────────────
// LLM 응답 검증 · 재시도 · fallback
// ─────────────────────────────────────────────────────────────

const fallbackProvider = new MockLLMProvider();

export async function generateValidatedResponse(
  provider: LLMProvider,
  input: DecisionLLMInput,
): Promise<{ response: DecisionLLMResponse; usedFallback: boolean }> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const raw = await provider.generateDecisionResponse(input);
      const parsed = LLMResponseSchema.safeParse(raw);
      if (parsed.success) return { response: parsed.data, usedFallback: false };
      lastError = parsed.error;
    } catch (error) {
      if (error instanceof LLMUnavailableError) throw error;
      lastError = error;
    }
  }
  // 형식 오류가 2번 연속이면 Mock 응답으로 대체해 화면이 깨지지 않게 한다
  if (provider.name === fallbackProvider.name) throw new LLMUnavailableError(String(lastError));
  const response = await fallbackProvider.generateDecisionResponse(input);
  return { response, usedFallback: true };
}

// ─────────────────────────────────────────────────────────────
// 컨텍스트 병합
// ─────────────────────────────────────────────────────────────

function mergeContext(context: DecisionContext, response: DecisionLLMResponse): DecisionContext {
  const next: DecisionContext = {
    ...context,
    topic: response.topic ?? context.topic,
    category: context.category ?? response.category,
    question: response.question ?? context.question,
    userPreferences: { ...context.userPreferences, ...response.userPreferences },
    constraints: [...new Set([...context.constraints, ...(response.constraints ?? [])])],
  };
  if (response.category && (!context.category || context.category === "custom")) next.category = response.category;

  if (response.choices?.length) {
    next.choices = response.choices.slice(0, 4).map<DecisionChoice>((draft) => {
      const previous = context.choices.find((c) => sameName(c.name, draft.name));
      return {
        id: previous?.id ?? slugId("choice", draft.name),
        name: draft.name.trim(),
        description: draft.description ?? previous?.description,
        pros: draft.pros?.length ? draft.pros : (previous?.pros ?? []),
        cons: draft.cons?.length ? draft.cons : (previous?.cons ?? []),
        scores: {},
      };
    });
  }

  if (response.criteria?.length) {
    next.criteria = response.criteria.slice(0, 6).map<DecisionCriterion>((draft) => ({
      id: slugId("criterion", draft.name),
      name: draft.name.trim(),
      weight: Math.min(5, Math.max(1, Math.round(draft.weight))),
      description: draft.description,
    }));
  }

  // 선택지 × 기준 점수 (이름 기반 → id 기반)
  const scores = response.choiceScores ?? {};
  next.choices = next.choices.map((choice) => {
    const byName = Object.entries(scores).find(([name]) => sameName(name, choice.name))?.[1];
    const merged: Record<string, number> = {};
    for (const criterion of next.criteria) {
      const fromResponse = byName && Object.entries(byName).find(([name]) => sameName(name, criterion.name))?.[1];
      const fromPrevious = context.choices.find((c) => c.id === choice.id)?.scores?.[criterion.id];
      const value = fromResponse ?? fromPrevious;
      if (typeof value === "number") merged[criterion.id] = Math.min(5, Math.max(1, Math.round(value)));
    }
    return { ...choice, scores: merged };
  });

  next.missingInformation = response.nextQuestion ? [response.nextQuestion.id] : [];
  return next;
}

function analysisSignature(context: DecisionContext): string {
  return JSON.stringify({
    choices: context.choices.map((c) => [c.name, c.scores]),
    criteria: context.criteria.map((c) => [c.name, c.weight]),
  });
}

function highRiskDomainOf(context: DecisionContext): string | undefined {
  const value = context.userPreferences.highRisk;
  return typeof value === "string" && value ? value : undefined;
}

function appendResult(session: DecisionSession, leadingMessages: ChatMessage[]): DecisionSession {
  const context = session.context.criteria.length
    ? session.context
    : { ...session.context, criteria: [{ id: slugId("criterion", "만족도"), name: "만족도", weight: 3 }] };
  const result = analyzeDecision(context, { highRiskDomain: highRiskDomainOf(context) });
  const resultId = createId("res");

  const resultMessage = assistant(
    `${result.fortuneMessage}\n\n${result.summary}`,
    "presenting_result",
    {
      type: "result",
      metadata: { stage: "presenting_result", resultId },
      options: toQuickReplies(["결과 자세히 보기|" + ACTION_VIEW_RESULT, "선택지 수정하기|" + ACTION_EDIT_CHOICES]),
    },
  );

  return touch({
    ...session,
    context,
    stage: "presenting_result",
    result,
    messages: [...session.messages, ...leadingMessages, resultMessage],
  });
}

// ─────────────────────────────────────────────────────────────
// 공개 API
// ─────────────────────────────────────────────────────────────

export function appendUserMessage(session: DecisionSession, content: string): DecisionSession {
  const trimmed = content.trim();
  const stage: DecisionStage = session.stage === "greeting" ? "understanding" : session.stage;
  const message = createMessage({ role: "user", type: "text", content: trimmed, metadata: { stage } });
  const title = session.title === "새 고민" ? trimmed.slice(0, 30) : session.title;
  return touch({ ...session, stage, title, messages: [...session.messages, message] });
}

/** 마지막 사용자 메시지 이후의 오류 메시지 등을 제거한다. */
export function trimAfterLastUserMessage(session: DecisionSession): { session: DecisionSession; lastUserMessage?: ChatMessage } {
  const index = session.messages.map((m) => m.role).lastIndexOf("user");
  if (index < 0) return { session };
  return {
    session: { ...session, messages: session.messages.slice(0, index + 1) },
    lastUserMessage: session.messages[index],
  };
}

/** 사용자 메시지가 이미 추가된 세션에 대해 코기의 응답을 만든다. */
export async function respondToLastUserMessage(session: DecisionSession, provider: LLMProvider): Promise<DecisionSession> {
  const { session: base, lastUserMessage } = trimAfterLastUserMessage(session);
  if (!lastUserMessage) return session;
  const content = lastUserMessage.content;

  const input: DecisionLLMInput = {
    stage: base.stage,
    userMessage: content,
    context: base.context,
    recentMessages: base.messages
      .filter((m) => m.role !== "system" && m.type !== "error")
      .slice(-12)
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    askedQuestionCount: countQuestions(base),
  };

  const { response } = await generateValidatedResponse(provider, input);

  const previousSignature = analysisSignature(base.context);
  const context = mergeContext(base.context, response);

  const newMessages: ChatMessage[] = [];
  const highRisk = detectHighRisk(content) ?? (response.isHighRisk ? "고위험" : undefined);
  if (highRisk && !context.userPreferences.highRisk) context.userPreferences.highRisk = highRisk;
  if (highRisk && !context.userPreferences.highRiskNotified) {
    context.userPreferences.highRiskNotified = true;
    newMessages.push(assistant(`⚠️ ${HIGH_RISK_NOTICE}`, base.stage));
  }

  const reply = softenAssertiveText(response.reply);
  let next: DecisionSession = touch({
    ...base,
    context,
    category: context.category ?? base.category,
    title: context.topic ?? base.title,
  });

  const wasShowingResult = base.stage === "presenting_result" || base.stage === "completed";
  const question = response.nextQuestion;
  const asked = countQuestions(base);

  // 1) 선택지가 부족하면 선택지를 모은다
  if (context.choices.length < 2) {
    const stage: DecisionStage = "collecting_choices";
    newMessages.push(
      assistant(reply, stage, {
        type: "question",
        options: toQuickReplies(question?.options ?? undefined),
        metadata: { stage, questionId: "choices" },
      }),
    );
    next = { ...next, stage, context: { ...context, missingInformation: ["choices"] } };
    return { ...next, messages: [...next.messages, ...newMessages] };
  }

  // 2) 아직 물어볼 것이 있으면 질문한다 (무한 질문 방지)
  if (question && asked < MAX_QUESTIONS) {
    const stage: DecisionStage =
      question.id === "criteria" ? "collecting_criteria" : question.id === "choices" ? "collecting_choices" : "asking_questions";
    newMessages.push(
      // LLM 이 같은 질문을 자기 말로 이미 했다면 중복해서 붙이지 않고, 엉뚱한 질문만 했다면 원래 질문을 붙인다
      assistant(alreadyAsks(reply, question.text) ? reply : `${reply}\n\n${question.text}`, stage, {
        type: "question",
        options: toQuickReplies(question.options ?? undefined),
        metadata: { stage, questionId: question.id },
      }),
    );
    next = { ...next, stage };
    return { ...next, messages: [...next.messages, ...newMessages] };
  }

  // 3) 결과를 보여준 뒤 분석 조건이 바뀌지 않았다면 대화만 이어간다
  if (wasShowingResult && analysisSignature(context) === previousSignature) {
    newMessages.push(
      assistant(reply, base.stage, {
        options: toQuickReplies(["결과 보기|" + ACTION_VIEW_RESULT, "선택지 수정|" + ACTION_EDIT_CHOICES, "새 고민 시작|" + ACTION_NEW_DECISION]),
      }),
    );
    next = { ...next, stage: base.stage, context: { ...context, missingInformation: [] } };
    return { ...next, messages: [...next.messages, ...newMessages] };
  }

  // 4) 분석
  newMessages.push(assistant(reply, "analyzing"));
  next = { ...next, stage: "analyzing", context: { ...context, missingInformation: [] } };
  return appendResult(next, newMessages);
}

export async function processUserMessage(session: DecisionSession, content: string, provider: LLMProvider): Promise<DecisionSession> {
  if (!content.trim()) return session;
  return respondToLastUserMessage(appendUserMessage(session, content), provider);
}

export function reanalyzeSession(session: DecisionSession, weights?: Record<string, number>): DecisionSession {
  if (session.context.choices.length < 2) return session;
  const criteria = session.context.criteria.map((criterion) => ({
    ...criterion,
    weight: weights?.[criterion.id] !== undefined ? Math.min(5, Math.max(1, Math.round(weights[criterion.id]))) : criterion.weight,
  }));
  const base = { ...session, context: { ...session.context, criteria, missingInformation: [] } };
  return appendResult(base, [assistant("알겠어, 기준 중요도를 반영해서 수정구슬을 다시 들여다볼게! 🔮", "analyzing")]);
}

export function startChoiceEdit(session: DecisionSession): DecisionSession {
  const current = session.context.choices.map((c) => c.name).join(", ");
  const stage: DecisionStage = "collecting_choices";
  const message = assistant(
    `좋아, 선택지를 바꿔보자! ✏️\n지금 선택지는 ${current || "아직 없어"}.\n새로운 선택지를 쉼표로 구분해서 알려줘.`,
    stage,
    { type: "question", metadata: { stage, questionId: "choices" }, options: current ? toQuickReplies([current]) : undefined },
  );
  return touch({
    ...session,
    stage,
    context: { ...session.context, missingInformation: ["choices"] },
    messages: [...session.messages, message],
  });
}

export function completeSession(session: DecisionSession): DecisionSession {
  if (!session.result) return session;
  return touch({ ...session, stage: "completed" });
}

export function createErrorMessage(): ChatMessage {
  return createMessage({ role: "assistant", type: "error", content: LLM_ERROR_TEXT, metadata: {} });
}
