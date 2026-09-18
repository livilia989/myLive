import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import type { AppConfig } from "./config";
import { createProviders, type ProviderInfo, type ProviderRegistry } from "./llm/createProvider";
import { InMemoryDecisionRepository } from "./repositories/InMemoryDecisionRepository";
import type { DecisionRepository } from "./repositories/DecisionRepository";
import { createDecisionRouter } from "./routes/decisions";
import { DecisionService } from "./services/decisionService";
import { HttpError } from "./utils/httpError";
import { logger, requestLogger } from "./utils/logger";

export interface AppDependencies {
  repository?: DecisionRepository;
  providers?: ProviderRegistry;
  /** 테스트용: 두 엔진 모두 이 Provider 로 대체 */
  providerInfo?: ProviderInfo;
}

export function createApp(config: AppConfig, deps: AppDependencies = {}) {
  const repository = deps.repository ?? new InMemoryDecisionRepository();
  const registry: ProviderRegistry =
    deps.providers ??
    (deps.providerInfo
      ? { defaultEngine: "mock", engines: { mock: deps.providerInfo, llm: deps.providerInfo } }
      : createProviders(config));
  const service = new DecisionService(
    repository,
    { mock: registry.engines.mock.provider, llm: registry.engines.llm.provider },
    registry.defaultEngine,
  );

  const app = express();
  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    next();
  });
  app.use(cors({ origin: config.corsOrigins }));
  app.use(express.json({ limit: "1mb" }));
  app.use(requestLogger);

  app.get("/api/health", async (_req, res) => {
    const llm = registry.engines.llm;
    const llmReachable = await llm.healthCheck();
    const current = registry.engines[registry.defaultEngine];
    res.json({
      status: "ok",
      defaultEngine: registry.defaultEngine,
      provider: current.name,
      model: current.model,
      llmReachable: registry.defaultEngine === "mock" ? true : llmReachable,
      engines: {
        mock: { available: true },
        llm: { available: llmReachable, model: llm.model },
      },
    });
  });

  app.use("/api/decisions", createDecisionRouter(service));

  app.use((_req, res) => {
    res.status(404).json({ error: "NOT_FOUND", message: "요청한 API 를 찾을 수 없어요." });
  });

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof HttpError) {
      res.status(error.status).json({ error: error.code, message: error.message });
      return;
    }
    if (error instanceof SyntaxError) {
      res.status(400).json({ error: "BAD_REQUEST", message: "JSON 형식이 올바르지 않아요." });
      return;
    }
    // 사용자 입력이 섞일 수 있는 상세 내용은 남기지 않고 오류 종류만 기록한다
    logger.error(`Unhandled ${error instanceof Error ? error.name : typeof error}`);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "잠시 문제가 생겼어요. 다시 시도해 주세요." });
  });

  return app;
}
