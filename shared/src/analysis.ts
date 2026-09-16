import type { ChoiceResult, DecisionChoice, DecisionContext, DecisionCriterion, DecisionResult } from "./types";
import { HIGH_RISK_NOTICE, josa } from "./utils";

// ─────────────────────────────────────────────────────────────
// 분석 엔진
// 총점 = Σ (선택지의 기준별 점수 1~5 × 기준 가중치 1~5)
// 최종 추천은 LLM 이 아니라 이 엔진이 결정한다.
// ─────────────────────────────────────────────────────────────

export const ANALYSIS_DISCLAIMER = "이 결과는 네가 중요하게 생각한 기준을 바탕으로 한 참고용 분석이야.";

const DEFAULT_SCORE = 3;

export interface CriterionContribution {
  criterionId: string;
  criterionName: string;
  weight: number;
  score: number;
  contribution: number;
  maxContribution: number;
}

export interface ChoiceBreakdown {
  choice: DecisionChoice;
  total: number;
  maxTotal: number;
  normalized: number;
  contributions: CriterionContribution[];
}

export function getChoiceScore(choice: DecisionChoice, criterion: DecisionCriterion): number {
  const raw = choice.scores?.[criterion.id];
  return typeof raw === "number" && Number.isFinite(raw) ? Math.min(5, Math.max(1, raw)) : DEFAULT_SCORE;
}

export function calculateBreakdown(context: DecisionContext): ChoiceBreakdown[] {
  const { choices, criteria } = context;
  return choices.map((choice) => {
    const contributions = criteria.map((criterion) => {
      const score = getChoiceScore(choice, criterion);
      return {
        criterionId: criterion.id,
        criterionName: criterion.name,
        weight: criterion.weight,
        score,
        contribution: score * criterion.weight,
        maxContribution: 5 * criterion.weight,
      };
    });
    const total = contributions.reduce((sum, c) => sum + c.contribution, 0);
    const maxTotal = contributions.reduce((sum, c) => sum + c.maxContribution, 0);
    return {
      choice,
      total,
      maxTotal,
      normalized: maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0,
      contributions,
    };
  });
}

function rankBreakdowns(breakdowns: ChoiceBreakdown[]): Array<ChoiceBreakdown & { rank: number }> {
  const sorted = [...breakdowns].sort((a, b) => b.total - a.total);
  let rank = 0;
  let previousTotal: number | undefined;
  return sorted.map((item, index) => {
    if (item.total !== previousTotal) rank = index + 1;
    previousTotal = item.total;
    return { ...item, rank };
  });
}

function scoreOf(breakdown: ChoiceBreakdown, criterionId: string): number {
  return breakdown.contributions.find((c) => c.criterionId === criterionId)?.score ?? DEFAULT_SCORE;
}

function buildChoiceResult(
  item: ChoiceBreakdown & { rank: number },
  all: Array<ChoiceBreakdown & { rank: number }>,
  criteria: DecisionCriterion[],
): ChoiceResult {
  const others = all.filter((o) => o.choice.id !== item.choice.id);

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const suitableWhen: string[] = [];
  const notSuitableWhen: string[] = [];

  for (const criterion of criteria) {
    const mine = scoreOf(item, criterion.id);
    const bestOther = Math.max(...others.map((o) => scoreOf(o, criterion.id)), 0);
    if (mine >= 4) strengths.push(`${criterion.name} (${mine}/5)`);
    if (mine <= 2) weaknesses.push(`${criterion.name} (${mine}/5)`);
    if (others.length && mine > bestOther) suitableWhen.push(`${josa(criterion.name, "을/를")} 가장 중요하게 볼 때`);
    if (others.length && mine < bestOther) {
      const winner = others.find((o) => scoreOf(o, criterion.id) === bestOther);
      notSuitableWhen.push(
        `${criterion.name}만 놓고 보면 ${winner ? josa(winner.choice.name, "이/가") : "다른 선택지가"} 더 나아요`,
      );
    }
  }

  if (!strengths.length) {
    const best = [...item.contributions].sort((a, b) => b.score - a.score)[0];
    if (best) strengths.push(`${best.criterionName} 면에서 무난해요 (${best.score}/5)`);
  }
  if (!weaknesses.length) {
    const worst = [...item.contributions].sort((a, b) => a.score - b.score)[0];
    if (worst && worst.score <= 3) weaknesses.push(`${josa(worst.criterionName, "은/는")} 상대적으로 무난한 수준이에요 (${worst.score}/5)`);
  }
  if (!suitableWhen.length) suitableWhen.push("여러 기준을 두루 무난하게 챙기고 싶을 때");

  const reasoning = item.contributions.map(
    (c) => `${c.criterionName}: ${c.score}점 × 중요도 ${c.weight} = ${c.contribution}점`,
  );
  reasoning.push(`합계 ${item.total} / ${item.maxTotal}점 → 참고 점수 ${item.normalized}점`);

  const summary =
    item.rank === 1
      ? `네가 고른 기준에서 가장 높은 점수를 받았어요 (${item.normalized}점).`
      : `${item.rank}순위예요 (${item.normalized}점). ${
          suitableWhen[0] && others.length ? `${suitableWhen[0]}는 충분히 좋은 선택이에요.` : ""
        }`.trim();

  return {
    choiceId: item.choice.id,
    score: item.normalized,
    rank: item.rank,
    summary,
    strengths,
    weaknesses,
    suitableWhen,
    notSuitableWhen,
    reasoning,
  };
}

/** 기준 하나를 "가장 중요한 기준" 으로 바꿨을 때 1위가 바뀌는지 확인해 결과가 바뀌는 조건을 찾는다. */
function findFlipCondition(
  context: DecisionContext,
  topId: string,
): { criterion: DecisionCriterion; winner: DecisionChoice } | undefined {
  if (context.criteria.length < 2) return undefined;
  for (const criterion of context.criteria) {
    const boosted: DecisionContext = {
      ...context,
      criteria: context.criteria.map((c) =>
        c.id === criterion.id ? { ...c, weight: 5 } : { ...c, weight: Math.min(c.weight, 2) },
      ),
    };
    const ranked = rankBreakdowns(calculateBreakdown(boosted));
    if (ranked[0] && ranked[0].choice.id !== topId && ranked[0].total > (ranked[1]?.total ?? -1)) {
      return { criterion, winner: ranked[0].choice };
    }
  }
  return undefined;
}

export interface AnalyzeOptions {
  highRiskDomain?: string;
}

export function analyzeDecision(context: DecisionContext, options: AnalyzeOptions = {}): DecisionResult {
  if (context.choices.length === 0) {
    throw new Error("분석할 선택지가 없습니다.");
  }

  const ranked = rankBreakdowns(calculateBreakdown(context));
  const top = ranked[0];
  const second = ranked[1];
  const choiceResults = ranked.map((item) => buildChoiceResult(item, ranked, context.criteria));

  const gap = second ? top.normalized - second.normalized : 100;
  const confidence: DecisionResult["confidence"] = gap >= 15 ? "high" : gap >= 6 ? "medium" : "low";
  const topName = top.choice.name;

  // 추천 이유: (1위 점수 - 2위 점수) × 가중치 가 큰 기준 순
  const keyReasons = second
    ? context.criteria
        .map((criterion) => {
          const a = scoreOf(top, criterion.id);
          const b = scoreOf(second, criterion.id);
          return { criterion, a, b, impact: (a - b) * criterion.weight };
        })
        .filter((r) => r.impact > 0)
        .sort((x, y) => y.impact - x.impact)
        .slice(0, 3)
        .map(
          (r) =>
            `${r.criterion.name} 기준에서 ${josa(topName, "이/가")} 더 높게 평가됐어요 (${r.a}점 vs ${r.b}점, 중요도 ${r.criterion.weight})`,
        )
    : [`비교할 다른 선택지가 없어서 ${topName} 하나만 살펴봤어요.`];
  if (!keyReasons.length) keyReasons.push("기준별 점수가 거의 비슷해서 아주 작은 차이로 순위가 나뉘었어요.");

  const tradeoffs = second
    ? context.criteria
        .filter((criterion) => scoreOf(second, criterion.id) > scoreOf(top, criterion.id))
        .map(
          (criterion) =>
            `${criterion.name} 면에서는 ${josa(second.choice.name, "이/가")} 더 나아요 (${scoreOf(second, criterion.id)}점 vs ${scoreOf(top, criterion.id)}점)`,
        )
    : [];

  const flip = second ? findFlipCondition(context, top.choice.id) : undefined;
  const alternativeScenario = flip
    ? `만약 ${josa(flip.criterion.name, "을/를")} 가장 중요하게 본다면 ${flip.winner.name} 쪽이 더 잘 맞을 수 있어요.`
    : second
      ? `지금 기준에서는 순위가 쉽게 바뀌지 않지만, 새로운 기준이 생기면 ${josa(second.choice.name, "이/가")} 더 잘 맞을 수도 있어요.`
      : undefined;

  const summary = !second
    ? `${topName}의 기준별 특징을 정리했어요.`
    : confidence === "low"
      ? `${josa(topName, "과/와")} ${second.choice.name}의 점수가 거의 비슷해요. 아주 살짝 ${topName} 쪽이 앞서요.`
      : `네가 중요하게 생각한 기준에서는 ${josa(topName, "이/가")} ${top.normalized}점으로 가장 잘 맞아 보여요.`;

  const fortuneMessage = options.highRiskDomain
    ? `기준을 정리해 보면 ${topName} 쪽 점수가 조금 더 높게 나왔어요. 다만 이 결과만으로 결정하지 말고 꼭 전문가의 의견을 함께 확인해 주세요.`
    : confidence === "high"
      ? `수정구슬을 살펴본 결과… ✨ 이번 고민에서는 ${topName} 쪽에 조금 더 마음이 기울어요!`
      : confidence === "medium"
        ? `수정구슬을 살펴본 결과… ✨ 이번 고민에서는 ${topName} 쪽이 조금 더 잘 맞아 보여!`
        : `수정구슬이 두 갈래로 반짝이고 있어요… 🔮 아주 근소하게 ${topName} 쪽이 앞서지만, 어느 쪽을 골라도 괜찮아 보여요.`;

  const caution = options.highRiskDomain
    ? `${options.highRiskDomain} 관련 고민이에요. ${HIGH_RISK_NOTICE}`
    : `${ANALYSIS_DISCLAIMER} 점수는 객관적인 정답이 아니니, 마지막 선택은 네 마음에 맡겨줘.`;

  return {
    recommendedChoiceId: top.choice.id,
    summary,
    fortuneMessage,
    confidence,
    choiceResults,
    keyReasons,
    tradeoffs,
    alternativeScenario,
    caution,
  };
}
