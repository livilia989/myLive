import type { z } from "zod";

// ─────────────────────────────────────────────────────────────
// localStorage 안전 래퍼
// 저장소가 없거나(사생활 보호 모드), 데이터가 깨졌어도 예외를 던지지 않고 기본값으로 복구한다.
// ─────────────────────────────────────────────────────────────

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const memoryFallback = new Map<string, string>();
const memoryStorage: KeyValueStorage = {
  getItem: (key) => memoryFallback.get(key) ?? null,
  setItem: (key, value) => void memoryFallback.set(key, value),
  removeItem: (key) => void memoryFallback.delete(key),
};

export function getBrowserStorage(): KeyValueStorage {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const probe = "__storage_probe__";
      window.localStorage.setItem(probe, probe);
      window.localStorage.removeItem(probe);
      return window.localStorage;
    }
  } catch {
    // 접근 불가 → 메모리 저장소 사용
  }
  return memoryStorage;
}

export function readJson<T>(storage: KeyValueStorage, key: string, schema: z.ZodType<T>, fallback: T): T {
  try {
    const raw = storage.getItem(key);
    if (raw === null) return fallback;
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(storage: KeyValueStorage, key: string, value: unknown): void {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // 용량 초과 등 저장 실패는 앱을 멈추지 않는다
  }
}

export function readString(storage: KeyValueStorage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

export function writeString(storage: KeyValueStorage, key: string, value: string | null): void {
  try {
    if (value === null) storage.removeItem(key);
    else storage.setItem(key, value);
  } catch {
    // 무시
  }
}
