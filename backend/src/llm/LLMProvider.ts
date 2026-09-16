// LLM Provider Adapter 인터페이스
// 새 LLM(OllamaProvider, VLLMProvider, InternalLLMProvider 등)은 이 인터페이스만 구현하면 된다.
// frontend 는 어떤 Provider 가 쓰이는지 알 필요가 없다.
export type { DecisionLLMInput, DecisionLLMResponse, LLMProvider } from "@mylive/shared";
export { LLMUnavailableError } from "@mylive/shared";
