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
}

type SessionResponse = { session: DecisionSession };

export const httpDecisionApi: DecisionApi = {
  mode: "server",
  async createDecision(input) {
    return (await apiClient.post<SessionResponse>("/api/decisions", input)).session;
  },
  async sendMessage(session, content) {
    return (await apiClient.post<SessionResponse>(`/api/decisions/${session.id}/messages`, { content, session })).session;
  },
  async performAction(session, action) {
    return (await apiClient.post<SessionResponse>(`/api/decisions/${session.id}/messages`, { action, session })).session;
  },
  async analyze(session, weights) {
    return (await apiClient.post<SessionResponse>(`/api/decisions/${session.id}/analyze`, { session, weights })).session;
  },
  async retry(session) {
    return (await apiClient.post<SessionResponse>(`/api/decisions/${session.id}/retry`, { session })).session;
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
