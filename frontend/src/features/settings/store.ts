import { z } from "zod";
import { create } from "zustand";
import { getBrowserStorage, readJson, writeJson } from "@/lib/storage";

export const SETTINGS_KEY = "decision_settings";

export const SettingsSchema = z.object({
  /** server: backend API (Mock 또는 Ollama 등 실제 LLM) / browser: 브라우저 안 Mock LLM */
  llmMode: z.enum(["server", "browser"]),
  /** system: OS 설정 따름 / on: 항상 줄임 / off: 항상 움직임 */
  reduceMotion: z.enum(["system", "on", "off"]),
});

export type Settings = z.infer<typeof SettingsSchema>;

const defaults: Settings = {
  llmMode: import.meta.env.VITE_USE_MOCK_LLM === "true" ? "browser" : "server",
  reduceMotion: "system",
};

interface SettingsStore extends Settings {
  update(patch: Partial<Settings>): void;
}

const storage = getBrowserStorage();

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...readJson(storage, SETTINGS_KEY, SettingsSchema, defaults),
  update(patch) {
    set(patch);
    const { llmMode, reduceMotion } = get();
    writeJson(storage, SETTINGS_KEY, { llmMode, reduceMotion });
  },
}));
