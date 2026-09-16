import type { DecisionStage } from "./types";

export interface StageInfo {
  /** 진행 표시줄 라벨 */
  label: string;
  /** 헤더 상태 문구 */
  status: string;
  /** 1~5 진행 단계 */
  step: number;
  description: string;
}

export const STAGE_INFO: Record<DecisionStage, StageInfo> = {
  greeting: { label: "고민 듣기", status: "고민을 듣는 중", step: 1, description: "코기가 인사하고 고민을 기다려요." },
  understanding: { label: "고민 파악", status: "고민을 듣는 중", step: 1, description: "고민의 주제와 카테고리를 파악해요." },
  collecting_choices: { label: "선택지 확인", status: "선택지를 살펴보는 중", step: 2, description: "비교할 선택지를 모아요." },
  asking_questions: { label: "추가 질문", status: "고민을 듣는 중", step: 3, description: "비교에 필요한 정보를 물어봐요." },
  collecting_criteria: { label: "중요 기준", status: "고민을 듣는 중", step: 3, description: "중요하게 생각하는 기준을 확인해요." },
  analyzing: { label: "분석", status: "생각하는 중", step: 4, description: "기준 가중치와 점수로 선택지를 비교해요." },
  presenting_result: { label: "결과", status: "결과를 보여주는 중", step: 5, description: "운세 스타일로 결과를 알려줘요." },
  completed: { label: "완료", status: "고민 해결 완료", step: 5, description: "결과를 저장했어요." },
};

export const PROGRESS_STEPS = ["고민 듣기", "선택지", "질문·기준", "분석", "결과"] as const;
