import { STAGE_INFO } from "@mylive/shared";
import type { CorgiState, DecisionSession, DecisionStage, DecisionSummary } from "./types";

export { ACTION_EDIT_CHOICES, ACTION_NEW_DECISION, ACTION_VIEW_RESULT, PROGRESS_STEPS, STAGE_INFO } from "@mylive/shared";

export function toSummary(session: DecisionSession): DecisionSummary {
  return {
    id: session.id,
    title: session.title,
    category: session.category ?? session.context.category,
    stage: session.stage,
    hasResult: Boolean(session.result),
    updatedAt: session.updatedAt,
  };
}

export function stageStatus(stage: DecisionStage, isTyping: boolean): string {
  if (isTyping) {
    if (stage === "analyzing") return "선택지를 살펴보는 중";
    if (stage === "greeting" || stage === "understanding") return "고민을 듣는 중";
    return "생각하는 중";
  }
  return STAGE_INFO[stage].status;
}

export function corgiStateForStage(stage: DecisionStage): CorgiState {
  switch (stage) {
    case "greeting":
      return "idle";
    case "understanding":
    case "collecting_choices":
    case "collecting_criteria":
    case "asking_questions":
      return "listening";
    case "analyzing":
      return "analysis";
    case "presenting_result":
    case "completed":
      return "happy";
  }
}

export function choiceName(session: DecisionSession, choiceId: string): string {
  return session.context.choices.find((c) => c.id === choiceId)?.name ?? "선택지";
}

export function isHighRisk(session: DecisionSession): boolean {
  const value = session.context.userPreferences.highRisk;
  return typeof value === "string" && value.length > 0;
}

export function resultShareText(session: DecisionSession): string {
  const result = session.result;
  if (!result) return session.title;
  const lines = [
    `🔮 선택점쟁이 - ${session.title}`,
    "",
    result.fortuneMessage,
    "",
    ...result.choiceResults.map((r) => `${r.rank}위 ${choiceName(session, r.choiceId)} (${r.score}점)`),
    "",
    "이 결과는 내가 중요하게 생각한 기준을 바탕으로 한 참고용 분석이에요.",
    "운세는 재미로, 선택은 나답게.",
  ];
  return lines.join("\n");
}
