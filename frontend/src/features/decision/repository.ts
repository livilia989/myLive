import { z } from "zod";
import { getBrowserStorage, readJson, readString, writeJson, writeString, type KeyValueStorage } from "@/lib/storage";
import { DecisionSessionSchema } from "./schemas";
import type { DecisionSession } from "./types";

export const SESSIONS_KEY = "decision_sessions";
export const CURRENT_SESSION_KEY = "decision_current_session";
const MAX_SESSIONS = 100;

/**
 * 고민 기록 저장소 (Repository Pattern)
 * MVP 는 localStorage, 이후 DB API 구현체로 교체할 수 있다.
 */
export interface SessionRepository {
  list(): DecisionSession[];
  get(id: string): DecisionSession | undefined;
  save(session: DecisionSession): void;
  delete(id: string): void;
  clear(): void;
  getCurrentId(): string | null;
  setCurrentId(id: string | null): void;
}

export class LocalStorageSessionRepository implements SessionRepository {
  constructor(private readonly storage: KeyValueStorage = getBrowserStorage()) {}

  list(): DecisionSession[] {
    // 배열 자체가 깨졌으면 빈 배열, 개별 세션이 깨졌으면 그 세션만 버린다
    const raw = readJson<unknown[]>(this.storage, SESSIONS_KEY, z.array(z.unknown()), []);
    return raw
      .map((item) => DecisionSessionSchema.safeParse(item))
      .flatMap((parsed) => (parsed.success ? [parsed.data] : []))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  get(id: string): DecisionSession | undefined {
    return this.list().find((s) => s.id === id);
  }

  save(session: DecisionSession): void {
    const others = this.list().filter((s) => s.id !== session.id);
    writeJson(this.storage, SESSIONS_KEY, [session, ...others].slice(0, MAX_SESSIONS));
  }

  delete(id: string): void {
    writeJson(
      this.storage,
      SESSIONS_KEY,
      this.list().filter((s) => s.id !== id),
    );
    if (this.getCurrentId() === id) this.setCurrentId(null);
  }

  clear(): void {
    writeString(this.storage, SESSIONS_KEY, null);
    writeString(this.storage, CURRENT_SESSION_KEY, null);
  }

  getCurrentId(): string | null {
    return readString(this.storage, CURRENT_SESSION_KEY);
  }

  setCurrentId(id: string | null): void {
    writeString(this.storage, CURRENT_SESSION_KEY, id);
  }
}

export const sessionRepository: SessionRepository = new LocalStorageSessionRepository();
