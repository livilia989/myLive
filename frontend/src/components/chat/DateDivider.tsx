import { formatDateLabel } from "@/lib/date";

const DateDivider = ({ date }: { date: string }) => (
  <div role="separator" aria-label={formatDateLabel(date)} className="my-4 flex items-center gap-3">
    <span aria-hidden className="h-px flex-1 bg-lavender" />
    <span className="rounded-full bg-lavender/60 px-3 py-1 text-xs font-medium text-muted-strong">{formatDateLabel(date)}</span>
    <span aria-hidden className="h-px flex-1 bg-lavender" />
  </div>
);

export default DateDivider;
