import type { QuickReplyOption } from "@/features/decision/types";

export interface QuickReplyButtonsProps {
  options: QuickReplyOption[];
  onSelect: (option: QuickReplyOption) => void;
  disabled?: boolean;
  selected?: string | null;
}

const QuickReplyButtons = ({ options, onSelect, disabled, selected }: QuickReplyButtonsProps) => (
  <div role="group" aria-label="빠른 답변" className="mt-2 flex flex-wrap gap-2 pl-11">
    {options.map((option) => (
      <button
        key={option.id}
        type="button"
        disabled={disabled}
        aria-pressed={selected === option.value}
        onClick={() => onSelect(option)}
        className={`rounded-full border px-3.5 py-2 text-sm font-medium transition disabled:opacity-50 ${
          option.value.startsWith("action:")
            ? "border-purple bg-purple text-white hover:bg-purple-deep"
            : "border-purple/40 bg-white text-purple hover:bg-lavender/60"
        }`}
      >
        {option.label}
      </button>
    ))}
  </div>
);

export default QuickReplyButtons;
