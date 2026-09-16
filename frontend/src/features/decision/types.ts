import type { DecisionStage } from "@mylive/shared";

export type {
  ChatMessage,
  ChoiceResult,
  DecisionCategory,
  DecisionChoice,
  DecisionContext,
  DecisionCriterion,
  DecisionResult,
  DecisionSession,
  DecisionStage,
  MessageRole,
  MessageType,
  QuickReplyOption,
} from "@mylive/shared";

/** 코기 캐릭터 상태 (상태별 이미지 · 애니메이션) */
export type CorgiState = "idle" | "listening" | "thinking" | "analysis" | "happy" | "surprised" | "sleeping" | "error";

export interface DecisionSummary {
  id: string;
  title: string;
  category?: string;
  stage: DecisionStage;
  hasResult: boolean;
  updatedAt: string;
}
