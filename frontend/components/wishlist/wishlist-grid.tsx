"use client";

import Link from "next/link";
import { Heart, ArrowRight } from "lucide-react";

import { PropertyCard } from "@/components/property/property-card";
import { useWishlist } from "@/components/wishlist/wishlist-provider";
import { toPropertyCardData } from "@/lib/property-presenters";
import type { Property } from "@/types";

export function WishlistGrid({ properties }: { properties: Property[] }) {
  const { ids, ready, error, refresh } = useWishlist();
  const visible = ready ? properties.filter((property) => ids.has(property.id)) : properties;
  return (
    <>
      {error && <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-terracotta-200 bg-terracotta-50 p-4 text-sm text-terracotta-800">
        <p>{error}</p>
        <button type="button" onClick={() => { void refresh(); }} className="font-bold underline underline-offset-4">Retry wishlist sync</button>
      </div>}
      {visible.length ? (
        <>
          <p className="mb-5 text-sm font-semibold text-sand-800" aria-live="polite">{visible.length} saved {visible.length === 1 ? "stay" : "stays"}</p>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((property) => <PropertyCard key={property.id} property={toPropertyCardData(property)} />)}
          </div>
          <p className="mt-6 text-sm text-sand-700">Only published stays are shown. Saving a property does not reserve its dates or price.</p>
        </>
      ) : (
        <div className="rounded-3xl border border-sand-200 bg-sand-50 px-6 py-16 text-center shadow-card">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-terracotta-50 text-terracotta-500"><Heart className="size-7" aria-hidden="true" /></span>
          <h2 className="mt-5 font-serif text-3xl font-semibold">A little room for inspiration.</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-sand-800">Tap the heart on a stay you love to keep it here. Published properties from your wishlist will appear in this collection.</p>
          <Link href="/search" className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-full bg-majorelle-600 px-6 text-sm font-bold text-white transition hover:bg-majorelle-700 focus-visible:ring-2 focus-visible:ring-majorelle-500 focus-visible:ring-offset-2">Explore stays <ArrowRight className="size-4" aria-hidden="true" /></Link>
        </div>
      )}
    </>
  );
}
