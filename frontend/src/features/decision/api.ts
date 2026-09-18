import { apiClient } from "@/lib/apiClient";
import type { DecisionSession } from "./types";

/**
 * 고민 API 계약. HTTP(backend) 구현과 브라우저 Mock 구현이 같은 인터페이스를 따른다.
 */
export interface DecisionApi {
  readonly mode: "server" | "browser";
  createDecision(input: { title?: string; category?: string }): Promise<DecisionSession>;
  sendMessage(session: DecisionSession, content: string): Promise<DecisionSession>;
  performAction(session: DecisionSession, action: "edit_choices" | "complete"): Promise<DecisionSession>;
  analyze(session: DecisionSession, weights?: Record<string, number>): Promise<DecisionSession>;
  retry(session: DecisionSession): Promise<DecisionSession>;
  deleteDecision(id: string): Promise<void>;
  sendFeedback(id: string, helpful: boolean): Promise<void>;
  health(): Promise<HealthStatus>;
}

export interface HealthStatus {
  status: string;
  provider: string;
  model?: string;
  llmReachable: boolean;
  defaultEngine?: "mock" | "llm";
  engines?: {
    mock: { available: boolean };
    llm: { available: boolean; model?: string };
  };
}

type SessionResponse = { session: DecisionSession };

/** 서버 API. engine 은 X-LLM-Engine 헤더로 전달되어 서버가 규칙 엔진 / 실제 AI 중 하나를 쓴다. */
export function createHttpDecisionApi(engine: "mock" | "llm"): DecisionApi {
  const h = { "X-LLM-Engine": engine };
  return {
  mode: "server",
  async createDecision(input) {
    return (await apiClient.post<SessionResponse>("/api/decisions", input)).session;
  },
  async sendMessage(session, content) {
    return (await apiClient.post<SessionResponse>(`/api/decisions/${session.id}/messages`, { content, session }, h)).session;
  },
  async performAction(session, action) {
    return (await apiClient.post<SessionResponse>(`/api/decisions/${session.id}/messages`, { action, session }, h)).session;
  },
  async analyze(session, weights) {
    return (await apiClient.post<SessionResponse>(`/api/decisions/${session.id}/analyze`, { session, weights }, h)).session;
  },
  async retry(session) {
    return (await apiClient.post<SessionResponse>(`/api/decisions/${session.id}/retry`, { session }, h)).session;
  },
  async deleteDecision(id) {
    await apiClient.delete(`/api/decisions/${id}`);
  },
  async sendFeedback(id, helpful) {
    await apiClient.post(`/api/decisions/${id}/feedback`, { helpful });
  },
  async health() {
    return apiClient.get<HealthStatus>("/api/health");
  },
  };
}
