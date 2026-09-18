import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

// backend/.env.local → backend/.env 순서로 읽는다 (Node 내장 기능, 추가 패키지 없음)
// 먼저 읽은 값이 우선하므로 .env.local(비밀 값, git 제외)이 .env(공개 기본값)를 덮어쓴다.
for (const file of ["../.env.local", "../.env"]) {
  const envPath = fileURLToPath(new URL(file, import.meta.url));
  if (existsSync(envPath)) process.loadEnvFile(envPath);
}

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export const config = {
  port: Number(process.env.API_PORT ?? 8787),
  corsOrigins: (process.env.CORS_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  useMockLLM: bool(process.env.USE_MOCK_LLM, true),
  llm: {
    baseUrl: (process.env.LLM_BASE_URL ?? "http://localhost:11434/v1").replace(/\/+$/, ""),
    model: process.env.LLM_MODEL ?? "qwen2.5:3b",
    apiKey: process.env.LLM_API_KEY ?? "",
    timeoutMs: Number(process.env.LLM_TIMEOUT_MS ?? 180000),
    useRuleDraft: bool(process.env.LLM_USE_RULE_DRAFT, true),
  },
} as const;

export type AppConfig = typeof config;
