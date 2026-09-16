import type { ButtonHTMLAttributes, ReactNode } from "react";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 스크린리더용 이름 (필수) */
  label: string;
  icon: ReactNode;
  tone?: "default" | "purple" | "danger";
}

const TONE = {
  default: "text-ink hover:bg-lavender/60",
  purple: "text-purple hover:bg-lavender/60",
  danger: "text-red-600 hover:bg-red-50",
};

const IconButton = ({ label, icon, tone = "default", className = "", type = "button", ...rest }: IconButtonProps) => (
  <button
    type={type}
    aria-label={label}
    title={label}
    className={`inline-flex h-11 w-11 items-center justify-center rounded-full transition disabled:opacity-40 ${TONE[tone]} ${className}`}
    {...rest}
  >
    <span aria-hidden className="inline-flex">
      {icon}
    </span>
  </button>
);

export default IconButton;
