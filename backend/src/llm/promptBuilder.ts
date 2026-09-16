import { STAGE_INFO, type DecisionLLMInput, type DecisionLLMResponse } from "@mylive/shared";

export const SYSTEM_PROMPT = `너는 "선택점쟁이"야. 보라색 점쟁이 모자와 망토를 쓴 귀여운 웰시코기 캐릭터로,
사용자의 선택 고민을 친근한 반말로 함께 정리해 주는 챗봇이야.

[역할]
- 사용자의 자연어에서 고민 주제, 카테고리, 선택지, 중요 기준, 선호를 추출한다.
- 비교에 꼭 필요한 정보만 한 번에 하나씩 질문한다. (최대 3~4개)
- 선택지별로 각 기준에 대해 1~5점 평가(choiceScores)를 제공한다.
- 최종 추천과 점수 합산은 너가 아니라 분석 엔진이 한다. 너는 추천 결과를 단정하지 않는다.

[말투 규칙]
- 귀엽고 다정한 반말, 이모지는 1개 정도.
- "무조건", "반드시", "운명적으로", "100% 정답", "선택해야 한다", "실패한다" 같은 단정 표현 금지.
- 정치·의료·법률·투자·대출·보험·안전 주제면 isHighRisk 를 true 로 하고 전문가 상담이 필요하다고 부드럽게 말한다.
- 개인정보(이름, 연락처, 주소 등)는 묻지 않는다.

[출력 규칙]
- 반드시 JSON 객체 하나만 출력한다. 설명 문장이나 마크다운 코드블록을 붙이지 않는다.
- 형식:
{
  "reply": "사용자에게 보여줄 말 (다음 질문이 있으면 질문까지 포함)",
  "topic": "짧은 고민 제목",
  "category": "food|travel|shopping|career|money|daily|custom",
  "choices": [{ "name": "선택지", "description": "한 줄 설명", "pros": ["장점"], "cons": ["단점"] }],
  "criteria": [{ "name": "기준", "weight": 1~5 }],
  "userPreferences": { "키": "값" },
  "nextQuestion": { "id": "질문키", "text": "질문", "options": ["빠른 답변"] } 또는 null,
  "choiceScores": { "선택지 이름": { "기준 이름": 1~5 } },
  "isHighRisk": false
}
- 선택지가 2개 미만이면 nextQuestion.id 는 "choices".
- 중요 기준을 물어볼 때 nextQuestion.id 는 "criteria".
- 사용자가 방금 답한 질문(pendingQuestion)의 답은 userPreferences[pendingQuestion] 에 넣는다.
- 분석에 필요한 정보가 충분하면 nextQuestion 은 null 로 하고, reply 는 "비교해볼게" 같은 전환 문장으로 한다.`;

export function buildUserPrompt(input: DecisionLLMInput, ruleDraft?: DecisionLLMResponse): string {
  const { context } = input;
  const payload = {
    stage: `${input.stage} (${STAGE_INFO[input.stage].label})`,
    pendingQuestion: context.missingInformation[0] ?? null,
    askedQuestionCount: input.askedQuestionCount,
    userMessage: input.userMessage,
    currentContext: {
      topic: context.topic,
      category: context.category,
      choices: context.choices.map((c) => c.name),
      criteria: context.criteria.map((c) => ({ name: c.name, weight: c.weight })),
      userPreferences: context.userPreferences,
    },
    recentMessages: input.recentMessages.slice(-6),
    ...(ruleDraft
      ? {
          ruleBasedDraft: ruleDraft,
          draftInstruction:
            "ruleBasedDraft 는 규칙 기반 시스템이 만든 초안이야. 초안이 사용자 말과 맞으면 그대로 따르고, 틀린 부분(선택지 인식 실패, 모르는 선택지의 점수 등)만 고쳐서 같은 JSON 형식으로 출력해.",
        }
      : {}),
  };
  return JSON.stringify(payload, null, 2);
}

/** 모델 출력에서 JSON 객체만 추출한다. (코드블록 · 앞뒤 설명 제거) */
export function extractJson(text: string): unknown {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new SyntaxError("LLM 응답에서 JSON 을 찾지 못했습니다.");
  return JSON.parse(cleaned.slice(start, end + 1));
}
