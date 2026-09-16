// ─────────────────────────────────────────────────────────────
// 선택점쟁이 공용 데이터 모델
// frontend / backend 가 같은 타입을 사용한다.
// ─────────────────────────────────────────────────────────────

/**
 * 고민 해결 단계
 * - greeting: 세션 생성 직후, 코기가 인사하고 고민을 기다림
 * - understanding: 사용자의 첫 고민을 읽고 주제·카테고리를 파악하는 중
 * - collecting_choices: 비교할 선택지(2개 이상)를 모으는 중
 * - collecting_criteria: 사용자가 중요하게 생각하는 기준을 모으는 중
 * - asking_questions: 비교에 필요한 추가 정보(기간, 예산, 선호 등)를 묻는 중
 * - analyzing: 분석 엔진이 가중치 × 점수를 계산하는 중
 * - presenting_result: 결과를 보여주는 중
 * - completed: 사용자가 결과를 저장해 고민이 마무리됨
 */
export type DecisionStage =
  | "greeting"
  | "understanding"
  | "collecting_choices"
  | "collecting_criteria"
  | "asking_questions"
  | "analyzing"
  | "presenting_result"
  | "completed";

export type MessageRole = "user" | "assistant" | "system";

export type MessageType = "text" | "question" | "choice" | "result" | "loading" | "error";

export interface QuickReplyOption {
  id: string;
  label: string;
  value: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  type: MessageType;
  content: string;
  createdAt: string;
  options?: QuickReplyOption[];
  metadata?: {
    stage?: DecisionStage;
    questionId?: string;
    resultId?: string;
  };
}

export interface DecisionChoice {
  id: string;
  name: string;
  description?: string;
  pros: string[];
  cons: string[];
  /** criterionId → 1~5 점 */
  scores?: Record<string, number>;
}

export interface DecisionCriterion {
  id: string;
  name: string;
  /** 1~5 */
  weight: number;
  description?: string;
}

export interface DecisionContext {
  topic?: string;
  category?: string;
  question?: string;
  choices: DecisionChoice[];
  criteria: DecisionCriterion[];
  userPreferences: Record<string, string | number | boolean>;
  constraints: string[];
  /** 아직 확인하지 못한 정보 키 목록. 첫 번째 항목이 "지금 답을 기다리는 질문"이다. */
  missingInformation: string[];
}

export interface ChoiceResult {
  choiceId: string;
  /** 0~100 으로 정규화된 참고 점수 */
  score: number;
  rank: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suitableWhen: string[];
  notSuitableWhen: string[];
  reasoning: string[];
}

export interface DecisionResult {
  recommendedChoiceId: string;
  summary: string;
  fortuneMessage: string;
  confidence: "low" | "medium" | "high";
  choiceResults: ChoiceResult[];
  keyReasons: string[];
  tradeoffs: string[];
  alternativeScenario?: string;
  caution?: string;
}

export interface DecisionSession {
  id: string;
  title: string;
  category?: string;
  stage: DecisionStage;
  messages: ChatMessage[];
  context: DecisionContext;
  result?: DecisionResult;
  createdAt: string;
  updatedAt: string;
}

export type DecisionCategory = "food" | "travel" | "shopping" | "career" | "money" | "daily" | "custom";

// ─────────────────────────────────────────────────────────────
// LLM Adapter 입출력
// ─────────────────────────────────────────────────────────────

export interface DecisionLLMInput {
  stage: DecisionStage;
  userMessage: string;
  context: DecisionContext;
  /** 최근 대화 (system 제외, 오래된 것 → 최신 순) */
  recentMessages: Array<{ role: "user" | "assistant"; content: string }>;
  /** 지금까지 코기가 던진 질문 수 (무한 질문 방지용) */
  askedQuestionCount: number;
}

export interface LLMChoiceDraft {
  name: string;
  description?: string;
  pros?: string[];
  cons?: string[];
}

export interface LLMCriterionDraft {
  name: string;
  weight: number;
  description?: string;
}

export interface LLMNextQuestion {
  /** "criteria" 이면 기준 수집 질문, 그 외는 추가 정보 질문 */
  id: string;
  text: string;
  options?: string[];
}

/**
 * LLM 은 "이해·추출·질문·설명" 만 담당한다.
 * 점수 합산과 최종 추천은 analysis.ts 의 분석 엔진이 결정한다.
 */
export interface DecisionLLMResponse {
  reply: string;
  topic?: string;
  category?: string;
  question?: string;
  /** 인식된 선택지 전체 목록 (있으면 기존 목록을 교체) */
  choices?: LLMChoiceDraft[];
  /** 인식된 기준 전체 목록 (있으면 기존 목록을 교체) */
  criteria?: LLMCriterionDraft[];
  userPreferences?: Record<string, string | number | boolean>;
  constraints?: string[];
  /** 다음에 물어볼 질문. 없으면 분석 가능 상태로 본다. */
  nextQuestion?: LLMNextQuestion | null;
  /** 선택지 이름 → 기준 이름 → 1~5 (선택지 특성에 대한 LLM 의 평가) */
  choiceScores?: Record<string, Record<string, number>>;
  isHighRisk?: boolean;
}

export interface LLMProvider {
  readonly name: string;
  generateDecisionResponse(input: DecisionLLMInput): Promise<DecisionLLMResponse>;
}
