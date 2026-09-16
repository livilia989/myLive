import { z } from "zod";
import type {
  ChatMessage,
  ChoiceResult,
  DecisionChoice,
  DecisionContext,
  DecisionCriterion,
  DecisionLLMResponse,
  DecisionResult,
  DecisionSession,
} from "./types";

export const DecisionStageSchema = z.enum([
  "greeting",
  "understanding",
  "collecting_choices",
  "collecting_criteria",
  "asking_questions",
  "analyzing",
  "presenting_result",
  "completed",
]);

const PreferenceValueSchema = z.union([z.string(), z.number(), z.boolean()]);
const Score = z.number().min(0).max(5);

export const QuickReplyOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
});

export const ChatMessageSchema: z.ZodType<ChatMessage> = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  type: z.enum(["text", "question", "choice", "result", "loading", "error"]),
  content: z.string(),
  createdAt: z.string(),
  options: z.array(QuickReplyOptionSchema).optional(),
  metadata: z
    .object({
      stage: DecisionStageSchema.optional(),
      questionId: z.string().optional(),
      resultId: z.string().optional(),
    })
    .optional(),
});

export const DecisionChoiceSchema: z.ZodType<DecisionChoice> = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  pros: z.array(z.string()),
  cons: z.array(z.string()),
  scores: z.record(z.string(), Score).optional(),
});

export const DecisionCriterionSchema: z.ZodType<DecisionCriterion> = z.object({
  id: z.string(),
  name: z.string().min(1),
  weight: z.number().min(1).max(5),
  description: z.string().optional(),
});

export const DecisionContextSchema: z.ZodType<DecisionContext> = z.object({
  topic: z.string().optional(),
  category: z.string().optional(),
  question: z.string().optional(),
  choices: z.array(DecisionChoiceSchema),
  criteria: z.array(DecisionCriterionSchema),
  userPreferences: z.record(z.string(), PreferenceValueSchema),
  constraints: z.array(z.string()),
  missingInformation: z.array(z.string()),
});

export const ChoiceResultSchema: z.ZodType<ChoiceResult> = z.object({
  choiceId: z.string(),
  score: z.number(),
  rank: z.number().int().min(1),
  summary: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  suitableWhen: z.array(z.string()),
  notSuitableWhen: z.array(z.string()),
  reasoning: z.array(z.string()),
});

export const DecisionResultSchema: z.ZodType<DecisionResult> = z.object({
  recommendedChoiceId: z.string(),
  summary: z.string(),
  fortuneMessage: z.string(),
  confidence: z.enum(["low", "medium", "high"]),
  choiceResults: z.array(ChoiceResultSchema),
  keyReasons: z.array(z.string()),
  tradeoffs: z.array(z.string()),
  alternativeScenario: z.string().optional(),
  caution: z.string().optional(),
});

export const DecisionSessionSchema: z.ZodType<DecisionSession> = z.object({
  id: z.string().min(1),
  title: z.string(),
  category: z.string().optional(),
  stage: DecisionStageSchema,
  messages: z.array(ChatMessageSchema),
  context: DecisionContextSchema,
  result: DecisionResultSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * LLM 응답 검증용 스키마.
 * 소형 로컬 모델(Ollama)도 통과할 수 있도록 null 을 허용하고 가능한 값은 보정(coerce)한다.
 */
const nullish = <T extends z.ZodTypeAny>(schema: T) =>
  schema.nullish().transform((v) => (v === null ? undefined : v));

export const LLMResponseSchema: z.ZodType<DecisionLLMResponse, unknown> = z.object({
  reply: z.string().min(1),
  topic: nullish(z.string()),
  category: nullish(z.string()),
  question: nullish(z.string()),
  choices: nullish(
    z.array(
      z.object({
        name: z.string().min(1),
        description: nullish(z.string()),
        pros: nullish(z.array(z.string())),
        cons: nullish(z.array(z.string())),
      }),
    ),
  ),
  criteria: nullish(
    z.array(
      z.object({
        name: z.string().min(1),
        weight: z.coerce.number().transform((w) => Math.min(5, Math.max(1, Math.round(w) || 3))),
        description: nullish(z.string()),
      }),
    ),
  ),
  userPreferences: nullish(z.record(z.string(), PreferenceValueSchema)),
  constraints: nullish(z.array(z.string())),
  nextQuestion: z
    .object({
      id: z.string().min(1),
      text: z.string().min(1),
      options: nullish(z.array(z.string())),
    })
    .nullish(),
  choiceScores: nullish(
    z.record(
      z.string(),
      z.record(
        z.string(),
        z.coerce.number().transform((s) => Math.min(5, Math.max(1, Math.round(s) || 3))),
      ),
    ),
  ),
  isHighRisk: nullish(z.boolean()),
}) as z.ZodType<DecisionLLMResponse, unknown>;
