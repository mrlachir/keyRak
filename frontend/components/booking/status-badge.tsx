import { Circle } from "lucide-react";

import { cn } from "@/lib/utils";
import type { BookingStatus } from "@/types";

const styles: Record<BookingStatus, string> = {
  PENDING: "border-majorelle-200 bg-majorelle-50 text-majorelle-800",
  CONFIRMED: "border-olive-200 bg-olive-50 text-olive-800",
  CANCELLED: "border-terracotta-200 bg-terracotta-50 text-terracotta-800",
};

const dots: Record<BookingStatus, string> = {
  PENDING: "fill-amber-400 text-amber-400",
  CONFIRMED: "fill-olive-500 text-olive-500",
  CANCELLED: "fill-terracotta-500 text-terracotta-500",
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.7rem] font-extrabold tracking-[0.08em]",
        styles[status],
      )}
    >
      <Circle className={cn("size-2", dots[status])} aria-hidden="true" />
      {status}
    </span>
  );
}
