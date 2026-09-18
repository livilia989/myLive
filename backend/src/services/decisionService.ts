import {
  LLMUnavailableError,
  completeSession,
  createDecisionSession,
  nowIso,
  processUserMessage,
  reanalyzeSession,
  respondToLastUserMessage,
  startChoiceEdit,
  type DecisionSession,
  type LLMProvider,
} from "@mylive/shared";
import type { EngineName } from "../llm/createProvider";
import type { DecisionRepository } from "../repositories/DecisionRepository";
import { HttpError, badRequest, notFound } from "../utils/httpError";

export class DecisionService {
  constructor(
    private readonly repository: DecisionRepository,
    private readonly providers: Record<EngineName, LLMProvider>,
    private readonly defaultEngine: EngineName,
  ) {}

  /** 화면에서 고른 엔진 (없으면 서버 기본값) */
  private providerFor(engine?: EngineName): LLMProvider {
    return this.providers[engine ?? this.defaultEngine];
  }

  async create(input: { title?: string; category?: string }): Promise<DecisionSession> {
    return this.repository.save(createDecisionSession(input));
  }

  list() {
    return this.repository.list();
  }

  async get(id: string): Promise<DecisionSession> {
    const session = await this.repository.findById(id);
    if (!session) throw notFound();
    return session;
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  /** 클라이언트가 보낸 세션이 있으면 우선 사용하고, 없으면 저장소에서 찾는다. */
  private async resolve(id: string, clientSession?: DecisionSession): Promise<DecisionSession> {
    if (clientSession) {
      if (clientSession.id !== id) throw badRequest("세션 id 가 일치하지 않아요.");
      return clientSession;
    }
    return this.get(id);
  }

  private async withLLM(run: () => Promise<DecisionSession>): Promise<DecisionSession> {
    try {
      return await run();
    } catch (error) {
      if (error instanceof LLMUnavailableError) {
        throw new HttpError(502, "LLM_UNAVAILABLE", "수정구슬이 잠깐 흐려졌어요. 잠시 후 다시 시도해 주세요.");
      }
      throw error;
    }
  }

  async sendMessage(
    id: string,
    input: { content: string; session?: DecisionSession; action?: "edit_choices" | "complete" },
    engine?: EngineName,
  ): Promise<DecisionSession> {
    const base = await this.resolve(id, input.session);
    if (input.action === "edit_choices") return this.repository.save(startChoiceEdit(base));
    if (input.action === "complete") return this.repository.save(completeSession(base));
    if (!input.content.trim()) throw badRequest("메시지를 입력해 주세요.");
    const updated = await this.withLLM(() => processUserMessage(base, input.content, this.providerFor(engine)));
    return this.repository.save(updated);
  }

  async analyze(id: string, input: { session?: DecisionSession; weights?: Record<string, number> }): Promise<DecisionSession> {
    const base = await this.resolve(id, input.session);
    if (base.context.choices.length < 2) throw badRequest("비교할 선택지가 2개 이상 필요해요.");
    return this.repository.save(reanalyzeSession(base, input.weights));
  }

  async retry(id: string, input: { session?: DecisionSession }, engine?: EngineName): Promise<DecisionSession> {
    const base = await this.resolve(id, input.session);
    const updated = await this.withLLM(() => respondToLastUserMessage(base, this.providerFor(engine)));
    return this.repository.save(updated);
  }

  async feedback(id: string, input: { helpful: boolean; comment?: string }): Promise<void> {
    await this.repository.saveFeedback({ decisionId: id, ...input, createdAt: nowIso() });
  }
}
