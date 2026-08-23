import type { Metadata } from "next";
import Link from "next/link";
import { Filter, MapPin, SearchX, SlidersHorizontal, Sparkles } from "lucide-react";

import { AiSearchBar } from "@/components/property/ai-search-bar";
import { PropertyCard } from "@/components/property/property-card";
import { analyzeSearch, searchProperties, toPropertyCardData } from "@/lib/properties";
import type { AiSearchFilters, Property } from "@/types";

export const metadata: Metadata = {
  title: "Search stays",
  description: "Explore AI-matched Marrakesh rentals alongside their neighborhoods.",
};

function parsedQuery(value: string | string[] | undefined): string {
  const query = Array.isArray(value) ? value[0] : value;
  return query?.trim().slice(0, 500) ?? "";
}

function filterLabels(filters: AiSearchFilters | null): string[] {
  if (!filters) return ["All Marrakesh stays"];
  return [
    filters.location,
    filters.guests ? `${filters.guests} guest${filters.guests === 1 ? "" : "s"}` : null,
    ...filters.amenities,
  ].filter((value): value is string => Boolean(value));
}

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const query = parsedQuery((await searchParams).q);
  let filters: AiSearchFilters | null = null;
  let properties: Property[] = [];
  let searchError: string | null = null;

  try {
    filters = query ? await analyzeSearch(query) : null;
    properties = await searchProperties(filters ?? {});
  } catch {
    searchError =
      "We couldn’t translate that request right now. Check that the Spring Boot API and Gemini key are available, then try again.";
  }

  const cards = properties.map(toPropertyCardData);
  const labels = filterLabels(filters);

  return (
    <div className="min-h-screen bg-sand-100">
      <section className="border-b border-sand-200 bg-sand-50">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-terracotta-600">
            <Sparkles className="size-4" aria-hidden="true" />
            Your AI-assisted search
          </div>
          <div className="mt-4 max-w-4xl">
            <AiSearchBar defaultValue={query} />
          </div>
          <div className="hide-scrollbar mt-6 flex gap-2 overflow-x-auto pb-1" aria-label="AI-derived filters">
            <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-bold text-white">
              <SlidersHorizontal className="size-3.5" aria-hidden="true" /> Parsed filters
            </span>
            {labels.map((filter) => (
              <span
                key={filter}
                className="shrink-0 rounded-full border border-sand-300 bg-white px-4 py-2 text-xs font-bold text-sand-800"
              >
                {filter}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-[1600px] lg:grid-cols-[minmax(0,0.9fr)_minmax(430px,1.1fr)]">
        <section className="px-4 py-8 sm:px-6 lg:px-8 lg:py-10" aria-labelledby="search-results-title">
          <div className="mb-7 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">
                {searchError ? "Search needs attention" : `${cards.length} thoughtful match${cards.length === 1 ? "" : "es"}`}
              </p>
              <h1 id="search-results-title" className="mt-2 font-serif text-4xl font-semibold text-ink">
                Stays that understand you.
              </h1>
            </div>
            <button className="hidden items-center gap-2 text-xs font-bold text-sand-700 sm:inline-flex lg:hidden">
              <Filter className="size-4" /> Map view
            </button>
          </div>

          {searchError ? (
            <div className="rounded-3xl border border-terracotta-200 bg-terracotta-50 p-6 text-sm leading-6 text-terracotta-900" role="alert">
              {searchError}
            </div>
          ) : cards.length > 0 ? (
            <div className="space-y-5">
              {cards.map((property, index) => (
                <PropertyCard key={property.id} property={property} compact eager={index === 0} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-sand-200 bg-sand-50 p-8 text-center shadow-card">
              <SearchX className="mx-auto size-8 text-terracotta-500" aria-hidden="true" />
              <h2 className="mt-4 font-serif text-2xl font-semibold text-ink">No exact match yet.</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-sand-700">
                Try describing fewer amenities or a larger guest range. Your AI filters are shown above.
              </p>
            </div>
          )}
        </section>

        <aside
          className="relative hidden min-h-[calc(100vh-5rem)] overflow-hidden border-l border-sand-200 bg-olive-50 lg:sticky lg:top-20 lg:block lg:h-[calc(100vh-5rem)]"
          aria-label="Map results preview"
        >
          <div className="absolute inset-0 bg-zellige opacity-60" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,.8),rgba(247,248,238,.35))]" />
          <div className="absolute left-[16%] top-[12%] h-[110%] w-7 -rotate-[24deg] rounded-full border-x border-sand-300 bg-sand-100/80" />
          <div className="absolute left-[56%] top-[-10%] h-[125%] w-5 rotate-[18deg] rounded-full border-x border-sand-300 bg-sand-100/80" />
          <div className="absolute left-[-10%] top-[54%] h-6 w-[125%] -rotate-6 rounded-full border-y border-sand-300 bg-sand-100/80" />

          {cards.slice(0, 8).map((property, index) => (
            <Link
              key={property.id}
              href={`/properties/${property.id}`}
              style={{ left: `${24 + ((index * 23) % 58)}%`, top: `${23 + ((index * 19) % 58)}%` }}
              className="absolute z-10 inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full border-2 border-white bg-majorelle-600 px-3 py-2 text-xs font-bold text-white shadow-lg transition hover:scale-105 hover:bg-majorelle-700"
              aria-label={`View ${property.title}`}
            >
              <MapPin className="size-3.5" aria-hidden="true" />
              {new Intl.NumberFormat("fr-MA").format(property.pricePerNight)} MAD
            </Link>
          ))}

          <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-full border border-sand-200 bg-sand-50/95 px-4 py-2 text-xs font-bold text-sand-800 shadow-card backdrop-blur">
            Property positions ready for the final map layer
          </div>
        </aside>
      </div>
    </div>
  );
}
