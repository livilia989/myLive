import { createDecisionSession } from "@mylive/shared";
import { describe, expect, it } from "vitest";
import type { KeyValueStorage } from "@/lib/storage";
import { CURRENT_SESSION_KEY, LocalStorageSessionRepository, SESSIONS_KEY } from "./repository";

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

describe("LocalStorageSessionRepository", () => {
  it("저장 · 조회 · 삭제", () => {
    const repo = new LocalStorageSessionRepository(memoryStorage());
    const session = createDecisionSession({ title: "테스트" });
    repo.save(session);
    repo.setCurrentId(session.id);
    expect(repo.get(session.id)?.title).toBe("테스트");
    repo.delete(session.id);
    expect(repo.list()).toHaveLength(0);
    expect(repo.getCurrentId()).toBeNull();
  });

  it("JSON 이 깨져 있으면 오류 없이 빈 상태로 복구한다", () => {
    const repo = new LocalStorageSessionRepository(memoryStorage({ [SESSIONS_KEY]: "{not json", [CURRENT_SESSION_KEY]: "x" }));
    expect(repo.list()).toEqual([]);
  });

  it("형식이 잘못된 세션만 걸러낸다", () => {
    const valid = createDecisionSession();
    const repo = new LocalStorageSessionRepository(memoryStorage({ [SESSIONS_KEY]: JSON.stringify([valid, { id: 1, broken: true }]) }));
    expect(repo.list().map((s) => s.id)).toEqual([valid.id]);
  });

  it("저장소 접근 자체가 실패해도 예외를 던지지 않는다", () => {
    const throwing: KeyValueStorage = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    };
    const repo = new LocalStorageSessionRepository(throwing);
    expect(() => repo.save(createDecisionSession())).not.toThrow();
    expect(repo.list()).toEqual([]);
  });
});
