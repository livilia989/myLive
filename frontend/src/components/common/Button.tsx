import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "soft";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  fullWidth?: boolean;
}

const VARIANT: Record<Variant, string> = {
  primary: "bg-purple text-white shadow-soft hover:bg-purple-deep active:scale-[0.98]",
  secondary: "bg-white text-purple border border-purple/40 hover:bg-lavender/50",
  soft: "bg-lavender text-purple-deep hover:bg-lavender/70",
  ghost: "bg-transparent text-muted-strong hover:bg-lavender/40",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

const SIZE: Record<Size, string> = {
  sm: "px-3 py-2 text-sm rounded-xl gap-1.5",
  md: "px-4 py-3 text-sm rounded-2xl gap-2",
  lg: "px-5 py-4 text-base rounded-3xl gap-2",
};

const Button = ({ variant = "primary", size = "md", icon, fullWidth, className = "", children, type = "button", ...rest }: ButtonProps) => {
  // view
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT[variant]} ${SIZE[size]} ${
        fullWidth ? "w-full" : ""
      } ${className}`}
      {...rest}
    >
      {icon && <span aria-hidden className="inline-flex">{icon}</span>}
      {children}
    </button>
  );
};

export default Button;
