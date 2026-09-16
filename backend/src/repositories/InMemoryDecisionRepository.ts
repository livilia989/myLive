import type { DecisionSession } from "@mylive/shared";
import type { DecisionFeedback, DecisionRepository, DecisionSummary } from "./DecisionRepository";

const MAX_SESSIONS = 500;

export class InMemoryDecisionRepository implements DecisionRepository {
  private readonly sessions = new Map<string, DecisionSession>();
  private readonly feedbacks: DecisionFeedback[] = [];

  async list(): Promise<DecisionSummary[]> {
    return [...this.sessions.values()]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((s) => ({
        id: s.id,
        title: s.title,
        category: s.category,
        stage: s.stage,
        hasResult: Boolean(s.result),
        updatedAt: s.updatedAt,
      }));
  }

  async findById(id: string): Promise<DecisionSession | undefined> {
    return this.sessions.get(id);
  }

  async save(session: DecisionSession): Promise<DecisionSession> {
    this.sessions.set(session.id, session);
    if (this.sessions.size > MAX_SESSIONS) {
      const oldest = [...this.sessions.values()].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))[0];
      if (oldest) this.sessions.delete(oldest.id);
    }
    return session;
  }

  async delete(id: string): Promise<boolean> {
    return this.sessions.delete(id);
  }

  async saveFeedback(feedback: DecisionFeedback): Promise<void> {
    this.feedbacks.push(feedback);
  }
}
