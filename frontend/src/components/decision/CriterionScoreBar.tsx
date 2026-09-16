import ProgressBar from "../common/ProgressBar";

export interface CriterionScoreBarProps {
  name: string;
  score: number;
  weight: number;
  highlight?: boolean;
}

/** 기준별 점수(1~5)와 중요도, 기여 점수(점수 × 중요도) */
const CriterionScoreBar = ({ name, score, weight, highlight }: CriterionScoreBarProps) => (
  <div>
    <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
      <span className={`font-medium ${highlight ? "text-purple" : "text-ink"}`}>
        {name}
        <span className="ml-1 text-muted-strong">(중요도 {weight})</span>
      </span>
      <span className="tabular-nums text-muted-strong">
        {score}/5 · {score * weight}점
      </span>
    </div>
    <ProgressBar value={score} max={5} size="sm" tone={highlight ? "purple" : "muted"} label={`${name} 점수`} valueText={`5점 만점에 ${score}점`} />
  </div>
);

export default CriterionScoreBar;
