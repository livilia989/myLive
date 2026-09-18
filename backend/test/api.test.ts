import request from "supertest";
import { describe, expect, it } from "vitest";
import { LLMUnavailableError, MockLLMProvider, type DecisionSession, type LLMProvider } from "@mylive/shared";
import { createApp } from "../src/app";
import { config } from "../src/config";

const mockApp = () =>
  createApp({ ...config, useMockLLM: true }, { providerInfo: { provider: new MockLLMProvider(), name: "mock", healthCheck: async () => true } });

describe("REST API", () => {
  it("여행 고민을 끝까지 진행하고 기록을 조회 · 삭제한다", async () => {
    const app = mockApp();
    const created = await request(app).post("/api/decisions").send({}).expect(201);
    const id = created.body.session.id as string;

    let session: DecisionSession = created.body.session;
    for (const content of ["후쿠오카와 오사카 중 어디로 여행 갈지 고민이야", "2박 3일", "맛집과 이동 편의성이 중요해"]) {
      const res = await request(app).post(`/api/decisions/${id}/messages`).send({ content, session }).expect(200);
      session = res.body.session;
    }
    expect(session.stage).toBe("presenting_result");
    expect(session.result?.choiceResults.length).toBe(2);

    const reanalyzed = await request(app)
      .post(`/api/decisions/${id}/analyze`)
      .send({ weights: Object.fromEntries(session.context.criteria.map((c) => [c.id, 3])) })
      .expect(200);
    expect(reanalyzed.body.session.result).toBeDefined();

    await request(app).post(`/api/decisions/${id}/feedback`).send({ helpful: true }).expect(201);
    const list = await request(app).get("/api/decisions").expect(200);
    expect(list.body.decisions[0].hasResult).toBe(true);

    await request(app).delete(`/api/decisions/${id}`).expect(204);
    await request(app).get(`/api/decisions/${id}`).expect(404);
  });

  it("X-LLM-Engine 헤더로 규칙 엔진 / 실제 AI 를 요청마다 고른다", async () => {
    const mock = new MockLLMProvider();
    let llmCalls = 0;
    const llm: LLMProvider = {
      name: "fake-llm",
      generateDecisionResponse: async (input) => {
        llmCalls += 1;
        return mock.generateDecisionResponse(input);
      },
    };
    const app = createApp(config, {
      providers: {
        defaultEngine: "mock",
        engines: {
          mock: { provider: mock, name: "mock", healthCheck: async () => true },
          llm: { provider: llm, name: "fake-llm", model: "test-model", healthCheck: async () => true },
        },
      },
    });
    const created = await request(app).post("/api/decisions").send({}).expect(201);
    const id = created.body.session.id;

    await request(app).post(`/api/decisions/${id}/messages`).send({ content: "짜장면이랑 짬뽕 중 고민이야" }).expect(200);
    expect(llmCalls).toBe(0);

    await request(app)
      .post(`/api/decisions/${id}/messages`)
      .set("X-LLM-Engine", "llm")
      .send({ content: "매운 거 좋아!" })
      .expect(200);
    expect(llmCalls).toBe(1);

    const health = await request(app).get("/api/health").expect(200);
    expect(health.body.engines.llm).toEqual({ available: true, model: "test-model" });
  });

  it("잘못된 요청은 400 으로 응답한다", async () => {
    await request(mockApp()).post("/api/decisions/abc/messages").send({ content: 123 }).expect(400);
  });

  it("LLM 서버 오류는 502 로, 형식 오류는 Mock fallback 으로 처리한다", async () => {
    const down: LLMProvider = {
      name: "down",
      generateDecisionResponse: async () => {
        throw new LLMUnavailableError();
      },
    };
    const broken: LLMProvider = { name: "broken", generateDecisionResponse: async () => ({ nope: true }) as never };

    const downApp = createApp(config, { providerInfo: { provider: down, name: "down", healthCheck: async () => false } });
    const created = await request(downApp).post("/api/decisions").send({}).expect(201);
    const failed = await request(downApp)
      .post(`/api/decisions/${created.body.session.id}/messages`)
      .send({ content: "짜장면이랑 짬뽕 중 고민이야" })
      .expect(502);
    expect(failed.body.error).toBe("LLM_UNAVAILABLE");

    const brokenApp = createApp(config, { providerInfo: { provider: broken, name: "broken", healthCheck: async () => true } });
    const created2 = await request(brokenApp).post("/api/decisions").send({}).expect(201);
    const ok = await request(brokenApp)
      .post(`/api/decisions/${created2.body.session.id}/messages`)
      .send({ content: "짜장면이랑 짬뽕 중 고민이야" })
      .expect(200);
    expect(ok.body.session.context.choices).toHaveLength(2);
  });
});
