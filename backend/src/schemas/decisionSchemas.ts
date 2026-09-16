import { DecisionSessionSchema } from "@mylive/shared";
import { z } from "zod";

export {
  ChatMessageSchema,
  ChoiceResultSchema,
  DecisionChoiceSchema,
  DecisionContextSchema,
  DecisionCriterionSchema,
  DecisionResultSchema,
  DecisionSessionSchema,
  LLMResponseSchema,
} from "@mylive/shared";

export const CreateDecisionBodySchema = z.object({
  title: z.string().max(100).optional(),
  category: z.string().max(30).optional(),
});

export const SendMessageBodySchema = z.object({
  content: z.string().max(2000).default(""),
  /** 클라이언트(localStorage)가 가진 최신 세션. 서버 메모리가 비어 있어도 대화를 이어갈 수 있다. */
  session: DecisionSessionSchema.optional(),
  action: z.enum(["edit_choices", "complete"]).optional(),
});

export const AnalyzeBodySchema = z.object({
  session: DecisionSessionSchema.optional(),
  weights: z.record(z.string(), z.number().min(1).max(5)).optional(),
});

export const RetryBodySchema = z.object({
  session: DecisionSessionSchema.optional(),
});

export const FeedbackBodySchema = z.object({
  helpful: z.boolean(),
  comment: z.string().max(500).optional(),
});
