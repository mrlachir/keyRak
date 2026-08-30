"use client";

import { Heart, LoaderCircle, RotateCcw } from "lucide-react";

import { useWishlist } from "@/components/wishlist/wishlist-provider";
import { cn } from "@/lib/utils";

export function FavoriteButton({ propertyId, title, className, variant = "icon" }: { propertyId: string; title: string; className?: string; variant?: "icon" | "label" }) {
  const { ids, loading, error, pending, toggle } = useWishlist();
  const saved = ids.has(propertyId);
  const busy = loading || pending.has(propertyId);
  const label = error ? "Retry loading your wishlist" : `${saved ? "Remove" : "Save"} ${title} ${saved ? "from" : "to"} wishlist`;

  return (
    <button
      type="button"
      onClick={() => { void toggle(propertyId); }}
      disabled={busy}
      aria-label={label}
      aria-pressed={saved}
      aria-busy={busy}
      title={error ?? label}
      className={cn("rounded-full border bg-sand-50/95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-majorelle-500 focus-visible:ring-offset-2 disabled:cursor-wait", variant === "icon" ? "absolute right-3 z-10 grid size-11 place-items-center border-white/70 shadow-md backdrop-blur hover:scale-105" : "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 border-sand-300 px-5 text-sm font-bold hover:bg-terracotta-50", saved ? "text-terracotta-600" : "text-ink hover:text-terracotta-600", className)}
    >
      {busy ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
        : error ? <RotateCcw className="size-5" aria-hidden="true" />
        : <Heart className={cn("size-5", saved && "fill-current")} aria-hidden="true" />}
      {variant === "label" && <span>{error ? "Retry wishlist" : pending.has(propertyId) ? "Updating…" : saved ? "Saved to wishlist" : "Save to wishlist"}</span>}
    </button>
  );
}
