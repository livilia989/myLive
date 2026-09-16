import type { ReactNode } from "react";
import type { CorgiState } from "@/features/decision/types";
import CorgiCharacter from "../corgi/CorgiCharacter";

export interface EmptyStateProps {
  title: string;
  description?: string;
  state?: CorgiState;
  action?: ReactNode;
}

const EmptyState = ({ title, description, state = "sleeping", action }: EmptyStateProps) => (
  <div className="flex flex-col items-center px-6 py-12 text-center">
    <CorgiCharacter state={state} size={140} sparkles={false} alt="" />
    <h2 className="mt-6 text-lg font-bold text-ink">{title}</h2>
    {description && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-strong">{description}</p>}
    {action && <div className="mt-6">{action}</div>}
  </div>
);

export default EmptyState;
