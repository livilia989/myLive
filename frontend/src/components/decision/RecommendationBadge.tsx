import { Crown } from "lucide-react";

const RecommendationBadge = ({ label = "추천" }: { label?: string }) => (
  <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-1 text-xs font-bold text-ink">
    <Crown aria-hidden size={13} />
    {label}
  </span>
);

export default RecommendationBadge;
