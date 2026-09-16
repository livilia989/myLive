import { Scale } from "lucide-react";

const TradeoffCard = ({ tradeoffs, alternativeScenario }: { tradeoffs: string[]; alternativeScenario?: string }) => (
  <section className="card px-5 py-5 sm:px-7">
    <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
      <Scale aria-hidden size={20} className="text-purple" />
      반대 선택지가 더 잘 맞는 경우
    </h2>
    {alternativeScenario && <p className="mt-3 rounded-2xl bg-lavender/40 px-4 py-3 text-[15px] leading-relaxed text-ink">{alternativeScenario}</p>}
    {tradeoffs.length > 0 ? (
      <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-ink">
        {tradeoffs.map((item) => (
          <li key={item} className="flex gap-2">
            <span aria-hidden className="text-purple">
              ↔
            </span>
            {item}
          </li>
        ))}
      </ul>
    ) : (
      <p className="mt-3 text-sm text-muted-strong">지금 고른 기준에서는 추천 선택지가 모든 기준에서 뒤지지 않았어요.</p>
    )}
  </section>
);

export default TradeoffCard;
