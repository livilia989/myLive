import { appendUserMessage, createErrorMessage, createMessage } from "@mylive/shared";
import { create } from "zustand";
import { sleep } from "@/lib/date";
import { sessionRepository } from "./repository";
import { decisionService } from "./service";
import type { ChatMessage, CorgiState, DecisionContext, DecisionResult, DecisionSession, DecisionStage } from "./types";
import { corgiStateForStage } from "./utils";

// 응답이 너무 빨라도 코기가 "생각하는" 모습을 잠깐 보여준다
const MIN_TYPING_MS = 700;
const ANALYSIS_SHOW_MS = 1300;

interface DecisionState {
  sessions: DecisionSession[];
  currentSession: DecisionSession | null;
  messages: ChatMessage[];
  stage: DecisionStage;
  context: DecisionContext | null;
  isLoading: boolean;
  isTyping: boolean;
  error: string | null;
  result: DecisionResult | null;
  selectedQuickReply: string | null;
  characterState: CorgiState;
}

interface DecisionActions {
  createSession(input?: { title?: string; category?: string }): Promise<DecisionSession>;
  startNewDecision(content: string, category?: string): Promise<string>;
  loadSession(id: string): DecisionSession | null;
  addUserMessage(content: string): void;
  addAssistantMessage(content: string, extra?: Partial<ChatMessage>): void;
  sendMessage(content: string): Promise<void>;
  selectQuickReply(value: string | null): void;
  updateStage(stage: DecisionStage): void;
  updateContext(patch: Partial<DecisionContext>): void;
  setLoading(isLoading: boolean): void;
  setError(error: string | null): void;
  setResult(result: DecisionResult | null): void;
  setCharacterState(state: CorgiState): void;
  retryLastMessage(): Promise<void>;
  reanalyze(weights?: Record<string, number>): Promise<void>;
  editChoices(): Promise<void>;
  saveSession(): Promise<void>;
  deleteSession(id: string): Promise<void>;
  clearAllSessions(): void;
  resetSession(): void;
  sendFeedback(helpful: boolean): Promise<void>;
}

export type DecisionStore = DecisionState & DecisionActions;

const emptyState = {
  currentSession: null,
  messages: [],
  stage: "greeting" as DecisionStage,
  context: null,
  isLoading: false,
  isTyping: false,
  error: null,
  result: null,
  selectedQuickReply: null,
  characterState: "idle" as CorgiState,
};

export const useDecisionStore = create<DecisionStore>((set, get) => {
  /** 현재 세션을 바꾸고 파생 상태를 맞춘 뒤 localStorage 에 저장한다. */
  const commit = (session: DecisionSession, extra: Partial<DecisionState> = {}) => {
    sessionRepository.save(session);
    sessionRepository.setCurrentId(session.id);
    set({
      sessions: sessionRepository.list(),
      currentSession: session,
      messages: session.messages,
      stage: session.stage,
      context: session.context,
      result: session.result ?? null,
      ...extra,
    });
  };

  const isCurrent = (id: string) => get().currentSession?.id === id;

  /** 서버/Mock 응답을 받아 적용한다. 새 결과가 생기면 잠깐 분석 연출을 보여준다. */
  const applyResponse = async (before: DecisionSession, updated: DecisionSession, startedAt: number) => {
    const elapsed = Date.now() - startedAt;
    if (elapsed < MIN_TYPING_MS) await sleep(MIN_TYPING_MS - elapsed);

    const newResult = updated.result && updated.stage === "presenting_result" && updated.messages.length > before.messages.length;
    const hasNewResultMessage = newResult && updated.messages.at(-1)?.type === "result";
    if (hasNewResultMessage && isCurrent(updated.id)) {
      // 결과 메시지 직전까지 먼저 보여주고, 분석 연출 후 결과를 공개한다
      const withoutResult = { ...updated, stage: "analyzing" as DecisionStage, messages: updated.messages.slice(0, -1), result: undefined };
      set({
        messages: withoutResult.messages,
        stage: "analyzing",
        characterState: "analysis",
        isTyping: true,
      });
      await sleep(ANALYSIS_SHOW_MS);
    }

    if (isCurrent(updated.id)) {
      commit(updated, {
        isLoading: false,
        isTyping: false,
        error: null,
        characterState: hasNewResultMessage ? "happy" : corgiStateForStage(updated.stage),
      });
    } else {
      sessionRepository.save(updated);
      set({ sessions: sessionRepository.list() });
    }
  };

  const fail = (session: DecisionSession, error: unknown) => {
    const withError = { ...session, messages: [...session.messages, createErrorMessage()] };
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    if (isCurrent(session.id)) {
      commit(withError, { isLoading: false, isTyping: false, error: message, characterState: "error" });
    } else {
      sessionRepository.save(withError);
    }
  };

  return {
    sessions: sessionRepository.list(),
    ...emptyState,

    async createSession(input = {}) {
      const session = await decisionService.create(input);
      commit(session, { ...emptyState, currentSession: session, characterState: "idle" });
      return session;
    },

    async startNewDecision(content, category) {
      const session = await get().createSession({ category });
      void get().sendMessage(content);
      return session.id;
    },

    loadSession(id) {
      const current = get().currentSession;
      if (current?.id === id) return current;
      const session = sessionRepository.get(id);
      if (!session) return null;
      commit(session, {
        isLoading: false,
        isTyping: false,
        error: null,
        characterState: corgiStateForStage(session.stage),
      });
      return session;
    },

    addUserMessage(content) {
      const session = get().currentSession;
      if (!session) return;
      commit(appendUserMessage(session, content));
    },

    addAssistantMessage(content, extra = {}) {
      const session = get().currentSession;
      if (!session) return;
      const message = createMessage({ role: "assistant", type: "text", content, ...extra });
      commit({ ...session, messages: [...session.messages, message] });
    },

    async sendMessage(content) {
      const session = get().currentSession;
      const text = content.trim();
      if (!session || !text || get().isLoading) return;

      const startedAt = Date.now();
      const optimistic = appendUserMessage(session, text);
      commit(optimistic, { isLoading: true, isTyping: true, error: null, selectedQuickReply: null, characterState: "thinking" });
      try {
        const updated = await decisionService.sendMessage(session, text);
        await applyResponse(optimistic, updated, startedAt);
      } catch (error) {
        fail(optimistic, error);
      }
    },

    selectQuickReply(value) {
      set({ selectedQuickReply: value });
    },

    updateStage(stage) {
      const session = get().currentSession;
      if (session) commit({ ...session, stage });
    },

    updateContext(patch) {
      const session = get().currentSession;
      if (session) commit({ ...session, context: { ...session.context, ...patch } });
    },

    setLoading(isLoading) {
      set({ isLoading });
    },

    setError(error) {
      set({ error });
    },

    setResult(result) {
      const session = get().currentSession;
      if (session) commit({ ...session, result: result ?? undefined });
    },

    setCharacterState(characterState) {
      set({ characterState });
    },

    async retryLastMessage() {
      const session = get().currentSession;
      if (!session || get().isLoading) return;
      // 오류 메시지는 지우고 대화 내용은 유지한 채 다시 요청한다
      const lastUser = session.messages.map((m) => m.role).lastIndexOf("user");
      const cleaned = { ...session, messages: session.messages.slice(0, lastUser + 1) };
      const startedAt = Date.now();
      commit(cleaned, { isLoading: true, isTyping: true, error: null, characterState: "thinking" });
      try {
        const updated = await decisionService.retry(cleaned);
        await applyResponse(cleaned, updated, startedAt);
      } catch (error) {
        fail(cleaned, error);
      }
    },

    async reanalyze(weights) {
      const session = get().currentSession;
      if (!session || get().isLoading) return;
      set({ isLoading: true, characterState: "analysis" });
      try {
        const updated = await decisionService.analyze(session, weights);
        await sleep(600);
        commit(updated, { isLoading: false, error: null, characterState: "happy" });
      } catch (error) {
        set({ isLoading: false, error: error instanceof Error ? error.message : "재분석에 실패했어요.", characterState: "error" });
      }
    },

    async editChoices() {
      const session = get().currentSession;
      if (!session || get().isLoading) return;
      try {
        const updated = await decisionService.editChoices(session);
        commit(updated, { characterState: "listening", error: null });
      } catch (error) {
        set({ error: error instanceof Error ? error.message : "선택지 수정을 시작하지 못했어요." });
      }
    },

    async saveSession() {
      const session = get().currentSession;
      if (!session) return;
      let updated: DecisionSession;
      try {
        updated = await decisionService.complete(session);
      } catch {
        // 서버가 응답하지 않아도 로컬 기록에는 저장한다
        updated = session.result ? { ...session, stage: "completed", updatedAt: new Date().toISOString() } : session;
      }
      commit(updated, { characterState: "happy" });
    },

    async deleteSession(id) {
      sessionRepository.delete(id);
      if (isCurrent(id)) set({ ...emptyState });
      set({ sessions: sessionRepository.list() });
      await decisionService.remove(id);
    },

    clearAllSessions() {
      sessionRepository.clear();
      set({ sessions: [], ...emptyState });
    },

    resetSession() {
      sessionRepository.setCurrentId(null);
      set({ ...emptyState });
    },

    async sendFeedback(helpful) {
      const session = get().currentSession;
      if (session) await decisionService.feedback(session.id, helpful);
    },
  };
});
