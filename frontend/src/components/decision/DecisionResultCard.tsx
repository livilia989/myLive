import { Info } from "lucide-react";
import { ANALYSIS_DISCLAIMER } from "@/features/decision/analysis";
import { CONFIDENCE_LABEL } from "@/features/decision/prompts";
import type { DecisionResult } from "@/features/decision/types";
import RecommendationBadge from "./RecommendationBadge";

export interface DecisionResultCardProps {
  result: DecisionResult;
  recommendedName: string;
  score: number;
  highRisk: boolean;
}

const DecisionResultCard = ({ result, recommendedName, score, highRisk }: DecisionResultCardProps) => {
  const confidence = CONFIDENCE_LABEL[result.confidence];
  return (
    <section aria-labelledby="recommend-title" className="card overflow-hidden">
      <div className="bg-gradient-to-br from-purple to-purple-deep px-5 py-6 text-white sm:px-7">
        <div className="flex flex-wrap items-center gap-2">
          <RecommendationBadge label={highRisk ? "기준상 높은 점수" : "추천"} />
          <span className="text-xs text-white/85">참고 점수 {score}점</span>
        </div>
        <h2 id="recommend-title" className="mt-3 text-3xl font-extrabold tracking-tight">
          {recommendedName}
        </h2>
        <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-white/95">{result.fortuneMessage}</p>
      </div>
      <div className="space-y-4 px-5 py-5 sm:px-7">
        <p className="text-[15px] leading-relaxed text-ink">{result.summary}</p>
        <dl className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-lavender/40 px-4 py-3 text-sm">
          <dt className="font-semibold text-ink">신뢰도</dt>
          <dd className="flex items-center gap-2">
            <span aria-hidden className="tracking-widest text-purple">
              {confidence.dots}
            </span>
            <strong className="text-purple">{confidence.label}</strong>
            <span className="text-muted-strong">· {confidence.description}</span>
          </dd>
        </dl>
        <p className="flex gap-2 rounded-2xl border border-gold/60 bg-gold/10 px-4 py-3 text-sm leading-relaxed text-ink">
          <Info aria-hidden size={18} className="mt-0.5 shrink-0 text-purple" />
          <span>
            {ANALYSIS_DISCLAIMER}
            {result.caution && result.caution !== ANALYSIS_DISCLAIMER && (
              <span className="mt-1 block text-muted-strong">{result.caution.replace(ANALYSIS_DISCLAIMER, "").trim()}</span>
            )}
          </span>
        </p>
      </div>
    </section>
  );
};

export default DecisionResultCard;
