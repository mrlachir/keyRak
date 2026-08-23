import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ className, variant = "primary", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-majorelle-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" &&
          "bg-majorelle-600 text-white shadow-lg shadow-majorelle-900/15 hover:-translate-y-0.5 hover:bg-majorelle-700",
        variant === "secondary" &&
          "border border-sand-300 bg-sand-50 text-ink hover:border-terracotta-300 hover:bg-terracotta-50",
        variant === "ghost" && "text-sand-800 hover:bg-sand-200/70 hover:text-ink",
        className,
      )}
      {...props}
    />
  );
}
