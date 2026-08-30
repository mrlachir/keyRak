import Link from "next/link";

import { cn } from "@/lib/utils";

export function Logo({ className, compactOnMobile = false }: { className?: string; compactOnMobile?: boolean }) {
  return (
    <Link
      href="/"
      className={cn(
        "group inline-flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-majorelle-500 focus-visible:ring-offset-4",
        className,
      )}
      aria-label="KEYRAK home"
    >
      <span className="relative grid size-9 place-items-center overflow-hidden rounded-t-full rounded-b-lg bg-terracotta-500 text-sand-50 shadow-md shadow-terracotta-950/15">
        <span className="absolute inset-x-2 bottom-0 top-3 rounded-t-full border-2 border-sand-50/90" />
        <span className="size-1 rounded-full bg-sand-50" />
      </span>
      <span className={cn("font-serif text-2xl font-semibold tracking-[0.14em] text-ink transition group-hover:text-terracotta-700", compactOnMobile && "hidden sm:inline")}>
        KEYRAK
      </span>
    </Link>
  );
}
