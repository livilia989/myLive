import { MockLLMProvider, type LLMProvider } from "@mylive/shared";
import type { AppConfig } from "../config";
import { OpenAICompatibleProvider } from "./OpenAICompatibleProvider";

export interface ProviderInfo {
  provider: LLMProvider;
  name: string;
  model?: string;
  healthCheck: () => Promise<boolean>;
}

export function createProvider(config: AppConfig): ProviderInfo {
  if (config.useMockLLM) {
    return { provider: new MockLLMProvider(), name: "mock", healthCheck: async () => true };
  }
  const provider = new OpenAICompatibleProvider({
    baseUrl: config.llm.baseUrl,
    model: config.llm.model,
    apiKey: config.llm.apiKey,
    timeoutMs: config.llm.timeoutMs,
    useRuleDraft: config.llm.useRuleDraft,
  });
  return { provider, name: provider.name, model: config.llm.model, healthCheck: () => provider.healthCheck() };
}
