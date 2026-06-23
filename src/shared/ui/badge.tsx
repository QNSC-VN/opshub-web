import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/utils";

const tones: Record<string, string> = {
  neutral:  "bg-zinc-100 text-zinc-600",
  green:    "bg-green-50 text-green-700",
  amber:    "bg-amber-50 text-amber-700",
  red:      "bg-red-50 text-red-700",
  blue:     "bg-blue-50 text-blue-700",
  violet:   "bg-violet-50 text-violet-700",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: keyof typeof tones;
}

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
