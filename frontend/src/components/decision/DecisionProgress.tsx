import { Check } from "lucide-react";
import type { DecisionStage } from "@/features/decision/types";
import { PROGRESS_STEPS, STAGE_INFO } from "@/features/decision/utils";

/** 대화 단계 표시 (현재 단계는 색 + 굵은 글씨 + 스크린리더 텍스트로 전달) */
const DecisionProgress = ({ stage }: { stage: DecisionStage }) => {
  const current = STAGE_INFO[stage].step;
  return (
    <nav aria-label="고민 진행 단계" className="border-b border-lavender/60 bg-cream/95 px-4 py-2">
      <ol className="flex items-center justify-between gap-1">
        {PROGRESS_STEPS.map((label, index) => {
          const step = index + 1;
          const done = step < current || stage === "completed";
          const active = step === current && stage !== "completed";
          return (
            <li key={label} className="flex flex-1 flex-col items-center gap-1" aria-current={active ? "step" : undefined}>
              <span
                aria-hidden
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  done ? "bg-purple text-white" : active ? "bg-gold text-ink ring-2 ring-gold/40" : "bg-lavender text-muted-strong"
                }`}
              >
                {done ? <Check size={12} strokeWidth={3} /> : step}
              </span>
              <span className={`text-[10px] leading-none sm:text-[11px] ${active ? "font-bold text-purple" : "text-muted-strong"}`}>
                {label}
                <span className="sr-only">{done ? " (완료)" : active ? " (진행 중)" : " (대기)"}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default DecisionProgress;
