import { ThumbsDown, ThumbsUp } from "lucide-react";
import { getChoiceScore } from "@/features/decision/analysis";
import type { ChoiceResult, DecisionSession } from "@/features/decision/types";
import CriterionScoreBar from "./CriterionScoreBar";
import RecommendationBadge from "./RecommendationBadge";

const ListBlock = ({ title, items, tone }: { title: string; items: string[]; tone: "good" | "bad" | "neutral" }) =>
  items.length ? (
    <div>
      <h4 className="flex items-center gap-1 text-xs font-bold text-muted-strong">
        {tone === "good" && <ThumbsUp aria-hidden size={13} className="text-emerald-600" />}
        {tone === "bad" && <ThumbsDown aria-hidden size={13} className="text-rose-500" />}
        {title}
      </h4>
      <ul className="mt-1 space-y-1 text-sm leading-relaxed text-ink">
        {items.map((item) => (
          <li key={item} className="flex gap-1.5">
            <span aria-hidden className="text-purple">
              •
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  ) : null;

const ChoiceComparisonCard = ({ session, result }: { session: DecisionSession; result: ChoiceResult }) => {
  // logic
  const choice = session.context.choices.find((c) => c.id === result.choiceId);
  if (!choice) return null;
  const isTop = result.rank === 1;
  const criteria = session.context.criteria;

  // view
  return (
    <article
      aria-labelledby={`choice-${choice.id}`}
      className={`card flex flex-col gap-4 px-5 py-5 ${isTop ? "border-2 border-purple/60" : ""}`}
    >
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-muted-strong">{result.rank}순위</p>
          <h3 id={`choice-${choice.id}`} className="text-xl font-extrabold text-ink">
            {choice.name}
          </h3>
          {choice.description && <p className="mt-0.5 text-sm text-muted-strong">{choice.description}</p>}
        </div>
        <div className="flex flex-col items-end gap-1">
          {isTop && <RecommendationBadge />}
          <p className="text-2xl font-extrabold tabular-nums text-purple">
            {result.score}
            <span className="text-sm font-semibold text-muted-strong">점</span>
          </p>
        </div>
      </header>

      <p className="text-sm leading-relaxed text-ink">{result.summary}</p>

      <div className="space-y-2.5">
        {criteria.map((criterion) => {
          const score = getChoiceScore(choice, criterion);
          const best = Math.max(...session.context.choices.map((c) => getChoiceScore(c, criterion)));
          return <CriterionScoreBar key={criterion.id} name={criterion.name} score={score} weight={criterion.weight} highlight={score === best} />;
        })}
      </div>

      <div className="grid gap-3">
        <ListBlock title="장점" tone="good" items={[...result.strengths, ...choice.pros].slice(0, 5)} />
        <ListBlock title="아쉬운 점" tone="bad" items={[...result.weaknesses, ...choice.cons].slice(0, 5)} />
        <ListBlock title="이런 경우 추천" tone="neutral" items={result.suitableWhen} />
        <ListBlock title="이런 경우에는 다른 선택지가 더 적합" tone="neutral" items={result.notSuitableWhen} />
      </div>

      <details className="rounded-2xl bg-cream px-4 py-3 text-sm">
        <summary className="cursor-pointer font-semibold text-purple">점수 계산 근거 보기</summary>
        <ul className="mt-2 space-y-1 tabular-nums text-muted-strong">
          {result.reasoning.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </details>
    </article>
  );
};

export default ChoiceComparisonCard;
