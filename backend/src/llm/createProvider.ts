import { MockLLMProvider, type LLMProvider } from "@mylive/shared";
import type { AppConfig } from "../config";
import { OpenAICompatibleProvider } from "./OpenAICompatibleProvider";

/** mock: 규칙 기반 엔진 / llm: OpenAI 호환 LLM (기본값은 로컬 Ollama) */
export type EngineName = "mock" | "llm";

export interface ProviderInfo {
  provider: LLMProvider;
  name: string;
  model?: string;
  healthCheck: () => Promise<boolean>;
}

export interface ProviderRegistry {
  /** 요청에 엔진 지정이 없을 때 쓰는 엔진 (backend/.env 의 USE_MOCK_LLM) */
  defaultEngine: EngineName;
  engines: Record<EngineName, ProviderInfo>;
}

export function parseEngine(value: unknown): EngineName | undefined {
  return value === "mock" || value === "llm" ? value : undefined;
}

/** 두 엔진을 모두 준비해 두고, 화면(설정)에서 고른 엔진으로 요청마다 바꿔 쓴다. */
export function createProviders(config: AppConfig): ProviderRegistry {
  const llm = new OpenAICompatibleProvider({
    baseUrl: config.llm.baseUrl,
    model: config.llm.model,
    apiKey: config.llm.apiKey,
    timeoutMs: config.llm.timeoutMs,
    useRuleDraft: config.llm.useRuleDraft,
  });
  return {
    defaultEngine: config.useMockLLM ? "mock" : "llm",
    engines: {
      mock: { provider: new MockLLMProvider(), name: "mock", healthCheck: async () => true },
      llm: { provider: llm, name: llm.name, model: config.llm.model, healthCheck: () => llm.healthCheck() },
    },
  };
}
