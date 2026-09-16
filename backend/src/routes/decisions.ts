import { Router, type Request } from "express";
import type { z } from "zod";
import {
  AnalyzeBodySchema,
  CreateDecisionBodySchema,
  FeedbackBodySchema,
  RetryBodySchema,
  SendMessageBodySchema,
} from "../schemas/decisionSchemas";
import type { DecisionService } from "../services/decisionService";
import { badRequest } from "../utils/httpError";

function parseBody<T extends z.ZodTypeAny>(schema: T, req: Request): z.infer<T> {
  const parsed = schema.safeParse(req.body ?? {});
  if (!parsed.success) throw badRequest();
  return parsed.data;
}

export function createDecisionRouter(service: DecisionService): Router {
  const router = Router();

  router.post("/", async (req, res) => {
    const body = parseBody(CreateDecisionBodySchema, req);
    res.status(201).json({ session: await service.create(body) });
  });

  router.get("/", async (_req, res) => {
    res.json({ decisions: await service.list() });
  });

  router.get("/:id", async (req, res) => {
    res.json({ session: await service.get(req.params.id) });
  });

  router.delete("/:id", async (req, res) => {
    await service.delete(req.params.id);
    res.status(204).end();
  });

  router.post("/:id/messages", async (req, res) => {
    const body = parseBody(SendMessageBodySchema, req);
    res.json({ session: await service.sendMessage(req.params.id, body) });
  });

  router.post("/:id/analyze", async (req, res) => {
    const body = parseBody(AnalyzeBodySchema, req);
    res.json({ session: await service.analyze(req.params.id, body) });
  });

  router.post("/:id/retry", async (req, res) => {
    const body = parseBody(RetryBodySchema, req);
    res.json({ session: await service.retry(req.params.id, body) });
  });

  router.post("/:id/feedback", async (req, res) => {
    const body = parseBody(FeedbackBodySchema, req);
    await service.feedback(req.params.id, body);
    res.status(201).json({ ok: true });
  });

  return router;
}
