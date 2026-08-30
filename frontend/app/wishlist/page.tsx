import type { Metadata } from "next";
import Link from "next/link";
import { Heart } from "lucide-react";

import { WishlistGrid } from "@/components/wishlist/wishlist-grid";
import { requireAuthenticatedSession } from "@/lib/access";
import { apiErrorMessage, apiFetch } from "@/lib/api";
import type { Property } from "@/types";

export const metadata: Metadata = { title: "Your wishlist" };

export default async function WishlistPage() {
  await requireAuthenticatedSession("/wishlist");
  let properties: Property[] = [];
  let error: string | null = null;
  try {
    properties = await apiFetch<Property[]>("/api/users/me/wishlist");
  } catch (cause) {
    error = apiErrorMessage(cause, "Your saved stays could not be loaded.");
  }
  return (
    <div className="mx-auto min-h-[65vh] max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <p className="eyebrow inline-flex items-center gap-2"><Heart className="size-4" aria-hidden="true" /> Your personal collection</p>
      <div className="mb-9 mt-3 flex flex-wrap items-end justify-between gap-5">
        <div><h1 className="font-serif text-4xl font-semibold sm:text-5xl">Stays worth saving.</h1>
          <p className="mt-3 max-w-xl leading-7 text-sand-800">Your favorite places, together in one private wishlist. Come back when you’re ready for your next trip.</p></div>
        <Link href="/search" className="text-sm font-bold text-majorelle-700 underline underline-offset-4">Keep exploring</Link>
      </div>
      {error ? <div role="alert" className="rounded-3xl border border-terracotta-200 bg-terracotta-50 p-8 text-terracotta-800">
        <p>{error}</p><a href="/wishlist" className="mt-4 inline-block font-bold underline underline-offset-4">Try again</a>
      </div> : <WishlistGrid properties={properties} />}
    </div>
  );
}
