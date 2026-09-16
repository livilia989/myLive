import { LLMUnavailableError, MockLLMProvider, type DecisionLLMInput, type DecisionLLMResponse, type LLMProvider } from "@mylive/shared";
import { SYSTEM_PROMPT, buildUserPrompt, extractJson } from "./promptBuilder";

export interface OpenAICompatibleOptions {
  baseUrl: string;
  model: string;
  apiKey?: string;
  timeoutMs: number;
  /** 규칙 기반 초안을 함께 전달할지 여부 (소형 로컬 모델 보조) */
  useRuleDraft: boolean;
}

/**
 * OpenAI Chat Completions 호환 API 어댑터
 * - OpenAI, 로컬 Ollama(/v1), vLLM, 사내 게이트웨이 등 같은 형식을 쓰는 서버에 연결된다.
 * - 네트워크/HTTP 오류는 LLMUnavailableError, 형식 오류는 일반 Error 로 던져
 *   decisionFlow 가 1회 재시도 후 fallback 하도록 한다.
 */
export class OpenAICompatibleProvider implements LLMProvider {
  readonly name = "openai-compatible";
  private readonly ruleProvider = new MockLLMProvider();

  constructor(private readonly options: OpenAICompatibleOptions) {}

  async generateDecisionResponse(input: DecisionLLMInput): Promise<DecisionLLMResponse> {
    const draft = this.options.useRuleDraft ? await this.ruleProvider.generateDecisionResponse(input) : undefined;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs);
    let response: Response;
    try {
      response = await fetch(`${this.options.baseUrl}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(this.options.apiKey ? { Authorization: `Bearer ${this.options.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: this.options.model,
          temperature: 0.3,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: buildUserPrompt(input, draft) },
          ],
        }),
      });
    } catch (error) {
      throw new LLMUnavailableError(error instanceof Error ? error.message : "LLM 서버에 연결할 수 없습니다.");
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      throw new LLMUnavailableError(`LLM API 오류 (HTTP ${response.status})`);
    }

    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("LLM 응답이 비어 있습니다.");
    return extractJson(content) as DecisionLLMResponse;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${this.options.baseUrl}/models`, {
        headers: this.options.apiKey ? { Authorization: `Bearer ${this.options.apiKey}` } : {},
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
