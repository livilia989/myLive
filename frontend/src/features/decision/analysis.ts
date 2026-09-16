// 분석 엔진은 backend 와 같은 구현을 사용한다 (shared 패키지)
export { ANALYSIS_DISCLAIMER, analyzeDecision, calculateBreakdown, getChoiceScore } from "@mylive/shared";
export type { ChoiceBreakdown, CriterionContribution } from "@mylive/shared";
