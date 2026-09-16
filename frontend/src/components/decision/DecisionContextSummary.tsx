import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import type { DecisionContext } from "@/features/decision/types";
import Button from "../common/Button";

export interface DecisionContextSummaryProps {
  context: DecisionContext;
  onReanalyze: (weights: Record<string, number>) => void;
  isLoading?: boolean;
}

const WEIGHT_LABEL = ["", "조금", "보통 이하", "보통", "중요", "매우 중요"];

/** 기준과 중요도를 보여주고, 중요도를 바꿔 다시 분석할 수 있다. */
const DecisionContextSummary = ({ context, onReanalyze, isLoading }: DecisionContextSummaryProps) => {
  // logic
  const [weights, setWeights] = useState<Record<string, number>>(() =>
    Object.fromEntries(context.criteria.map((c) => [c.id, c.weight])),
  );
  const changed = context.criteria.some((c) => weights[c.id] !== undefined && weights[c.id] !== c.weight);

  // view
  return (
    <section aria-labelledby="criteria-title" className="card px-5 py-5 sm:px-7">
      <h2 id="criteria-title" className="flex items-center gap-2 text-lg font-bold text-ink">
        <SlidersHorizontal aria-hidden size={20} className="text-purple" />
        내가 고른 기준
      </h2>
      <p className="mt-1 text-sm text-muted-strong">중요도를 바꾸면 결과가 어떻게 달라지는지 다시 분석해볼 수 있어요.</p>

      <ul className="mt-4 space-y-4">
        {context.criteria.map((criterion) => {
          const value = weights[criterion.id] ?? criterion.weight;
          return (
            <li key={criterion.id}>
              <label htmlFor={`weight-${criterion.id}`} className="flex items-baseline justify-between text-sm">
                <span className="font-semibold text-ink">{criterion.name}</span>
                <span className="text-muted-strong">
                  중요도 <strong className="text-purple">{value}</strong> · {WEIGHT_LABEL[value]}
                </span>
              </label>
              <input
                id={`weight-${criterion.id}`}
                type="range"
                min={1}
                max={5}
                step={1}
                value={value}
                aria-valuetext={`${value}, ${WEIGHT_LABEL[value]}`}
                onChange={(event) => setWeights((prev) => ({ ...prev, [criterion.id]: Number(event.target.value) }))}
                className="mt-2 w-full accent-[var(--purple)]"
              />
            </li>
          );
        })}
      </ul>

      {Object.keys(context.userPreferences).length > 0 && (
        <p className="mt-4 text-xs text-muted-strong">
          선택지: {context.choices.map((c) => c.name).join(", ")}
        </p>
      )}

      <Button className="mt-5" variant={changed ? "primary" : "secondary"} fullWidth disabled={isLoading} onClick={() => onReanalyze(weights)}>
        {isLoading ? "수정구슬을 다시 보는 중…" : changed ? "바꾼 중요도로 다시 분석하기" : "다시 분석하기"}
      </Button>
    </section>
  );
};

export default DecisionContextSummary;
