import type { DecisionSession } from "@/features/decision/types";
import { choiceName } from "@/features/decision/utils";

/** 선택지별 참고 점수 막대 그래프 (순위 텍스트를 함께 표시해 색에만 의존하지 않음) */
const ChoiceComparisonChart = ({ session }: { session: DecisionSession }) => {
  const results = session.result?.choiceResults ?? [];
  return (
    <section aria-labelledby="chart-title" className="card px-5 py-5 sm:px-7">
      <h2 id="chart-title" className="text-lg font-bold text-ink">
        한눈에 비교
      </h2>
      <ul className="mt-4 space-y-3">
        {results.map((r) => (
          <li key={r.choiceId} className="grid grid-cols-[4.5rem_1fr_3rem] items-center gap-3 sm:grid-cols-[7rem_1fr_3.5rem]">
            <span className="truncate text-sm font-semibold text-ink" title={choiceName(session, r.choiceId)}>
              {r.rank}위 {choiceName(session, r.choiceId)}
            </span>
            <div
              className="h-4 overflow-hidden rounded-full bg-lavender/60"
              role="img"
              aria-label={`${choiceName(session, r.choiceId)} ${r.score}점`}
            >
              <div
                className={`h-full rounded-full transition-[width] duration-700 ${r.rank === 1 ? "bg-gradient-to-r from-purple to-gold" : "bg-muted"}`}
                style={{ width: `${r.score}%` }}
              />
            </div>
            <span className="text-right text-sm font-bold tabular-nums text-ink">{r.score}점</span>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default ChoiceComparisonChart;
