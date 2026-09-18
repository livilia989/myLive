import { createDecisionSession } from "@mylive/shared";
import { useSettingsStore } from "@/features/settings/store";
import { createHttpDecisionApi, type DecisionApi } from "./api";
import { browserMockDecisionApi } from "./mockApi";
import type { DecisionSession } from "./types";

/**
 * 비즈니스 로직 계층
 * Zustand store 는 이 서비스만 호출하고, 실제 API 구현(HTTP / 브라우저 Mock)은 알지 못한다.
 */
function currentApi(): DecisionApi {
  const engine = useSettingsStore.getState().engine;
  return engine === "browser" ? browserMockDecisionApi : createHttpDecisionApi(engine);
}

export const decisionService = {
  async create(input: { title?: string; category?: string }): Promise<DecisionSession> {
    try {
      return await currentApi().createDecision(input);
    } catch {
      // 서버가 잠시 꺼져 있어도 대화 화면은 열 수 있게 로컬에서 세션을 만든다
      return createDecisionSession(input);
    }
  },

  sendMessage: (session: DecisionSession, content: string) => currentApi().sendMessage(session, content),
  editChoices: (session: DecisionSession) => currentApi().performAction(session, "edit_choices"),
  complete: (session: DecisionSession) => currentApi().performAction(session, "complete"),
  analyze: (session: DecisionSession, weights?: Record<string, number>) => currentApi().analyze(session, weights),
  retry: (session: DecisionSession) => currentApi().retry(session),

  async remove(id: string): Promise<void> {
    try {
      await currentApi().deleteDecision(id);
    } catch {
      // 서버 기록 삭제 실패는 무시 (로컬 기록이 기준)
    }
  },

  async feedback(id: string, helpful: boolean): Promise<void> {
    try {
      await currentApi().sendFeedback(id, helpful);
    } catch {
      // 피드백 전송 실패는 사용자 흐름을 막지 않는다
    }
  },

  health: () => currentApi().health(),
};
