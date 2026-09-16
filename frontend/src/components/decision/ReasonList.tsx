import type { ReactNode } from "react";

export interface ReasonListProps {
  title: string;
  items: string[];
  icon?: ReactNode;
  empty?: string;
}

const ReasonList = ({ title, items, icon, empty }: ReasonListProps) => (
  <section className="card px-5 py-5 sm:px-7">
    <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
      {icon && <span aria-hidden>{icon}</span>}
      {title}
    </h2>
    {items.length ? (
      <ol className="mt-3 space-y-2">
        {items.map((item, index) => (
          <li key={item} className="flex gap-3 text-[15px] leading-relaxed text-ink">
            <span
              aria-hidden
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lavender text-xs font-bold text-purple"
            >
              {index + 1}
            </span>
            {item}
          </li>
        ))}
      </ol>
    ) : (
      <p className="mt-3 text-sm text-muted-strong">{empty}</p>
    )}
  </section>
);

export default ReasonList;
