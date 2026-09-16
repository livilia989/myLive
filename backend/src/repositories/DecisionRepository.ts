import type { DecisionSession } from "@mylive/shared";

export interface DecisionFeedback {
  decisionId: string;
  helpful: boolean;
  comment?: string;
  createdAt: string;
}

export interface DecisionSummary {
  id: string;
  title: string;
  category?: string;
  stage: DecisionSession["stage"];
  hasResult: boolean;
  updatedAt: string;
}

/**
 * 저장소 추상화 (Repository Pattern)
 * MVP 는 메모리 저장소를 쓰고, 이후 DB 구현체로 교체할 수 있다.
 */
export interface DecisionRepository {
  list(): Promise<DecisionSummary[]>;
  findById(id: string): Promise<DecisionSession | undefined>;
  save(session: DecisionSession): Promise<DecisionSession>;
  delete(id: string): Promise<boolean>;
  saveFeedback(feedback: DecisionFeedback): Promise<void>;
}
