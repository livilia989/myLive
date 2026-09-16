import {
  MockLLMProvider,
  completeSession,
  createDecisionSession,
  processUserMessage,
  reanalyzeSession,
  respondToLastUserMessage,
  startChoiceEdit,
} from "@mylive/shared";
import type { DecisionApi } from "./api";

/**
 * 브라우저 Mock 모드
 * backend 없이도 같은 대화 흐름 · 분석 엔진 · Mock LLM 으로 전체 기능을 실행한다.
 */
const provider = new MockLLMProvider();

export const browserMockDecisionApi: DecisionApi = {
  mode: "browser",
  async createDecision(input) {
    return createDecisionSession(input);
  },
  async sendMessage(session, content) {
    return processUserMessage(session, content, provider);
  },
  async performAction(session, action) {
    return action === "edit_choices" ? startChoiceEdit(session) : completeSession(session);
  },
  async analyze(session, weights) {
    return reanalyzeSession(session, weights);
  },
  async retry(session) {
    return respondToLastUserMessage(session, provider);
  },
  async deleteDecision() {},
  async sendFeedback() {},
  async health() {
    return { status: "ok", provider: "browser-mock", llmReachable: true };
  },
};
