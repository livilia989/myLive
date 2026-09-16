export interface ProgressBarProps {
  value: number;
  max?: number;
  label: string;
  /** 시각적 라벨 대신 스크린리더에게만 알려줄 값 설명 */
  valueText?: string;
  tone?: "purple" | "gold" | "muted";
  size?: "sm" | "md";
}

const TONE = { purple: "bg-purple", gold: "bg-gold", muted: "bg-muted" };

const ProgressBar = ({ value, max = 100, label, valueText, tone = "purple", size = "md" }: ProgressBarProps) => {
  const percent = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuetext={valueText}
      className={`w-full overflow-hidden rounded-full bg-lavender/70 ${size === "sm" ? "h-1.5" : "h-2.5"}`}
    >
      <div className={`h-full rounded-full transition-[width] duration-700 ${TONE[tone]}`} style={{ width: `${percent}%` }} />
    </div>
  );
};

export default ProgressBar;
