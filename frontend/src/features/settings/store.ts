import { z } from "zod";
import { create } from "zustand";
import { getBrowserStorage, readJson, writeJson } from "@/lib/storage";

export const SETTINGS_KEY = "decision_settings";

/**
 * 대화 엔진
 * - browser: 서버 없이 브라우저 안에서 규칙 엔진(Mock) 실행
 * - mock: 서버의 규칙 엔진 (빠름)
 * - llm: 서버를 거쳐 로컬 Ollama 등 실제 AI 사용 (느릴 수 있음)
 */
export type Engine = "browser" | "mock" | "llm";

export const SettingsSchema = z.object({
  engine: z.enum(["browser", "mock", "llm"]),
  /** system: OS 설정 따름 / on: 항상 줄임 / off: 항상 움직임 */
  reduceMotion: z.enum(["system", "on", "off"]),
});

export type Settings = z.infer<typeof SettingsSchema>;

const defaults: Settings = {
  engine: import.meta.env.VITE_USE_MOCK_LLM === "true" ? "browser" : "mock",
  reduceMotion: "system",
};

/** 예전 설정({ llmMode: "server" | "browser" })도 읽어서 새 형식으로 바꾼다. */
const StoredSettingsSchema = z
  .object({
    engine: z.enum(["browser", "mock", "llm"]).optional(),
    llmMode: z.enum(["server", "browser"]).optional(),
    reduceMotion: z.enum(["system", "on", "off"]).optional(),
  })
  .transform(
    (raw): Settings => ({
      engine: raw.engine ?? (raw.llmMode === "browser" ? "browser" : defaults.engine),
      reduceMotion: raw.reduceMotion ?? defaults.reduceMotion,
    }),
  );

interface SettingsStore extends Settings {
  update(patch: Partial<Settings>): void;
}

const storage = getBrowserStorage();

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...readJson(storage, SETTINGS_KEY, StoredSettingsSchema as unknown as z.ZodType<Settings>, defaults),
  update(patch) {
    set(patch);
    const { engine, reduceMotion } = get();
    writeJson(storage, SETTINGS_KEY, { engine, reduceMotion });
  },
}));
