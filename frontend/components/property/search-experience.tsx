"use client";

import dynamic from "next/dynamic";
import {
  Bath,
  BedDouble,
  CalendarDays,
  ChevronDown,
  LoaderCircle,
  RotateCcw,
  SearchX,
  SlidersHorizontal,
  Sparkles,
  Tag as TagIcon,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { analyzeSearchAction, searchPropertiesAction } from "@/app/actions/search";
import { AiSearchBar } from "@/components/property/ai-search-bar";
import { PropertyCard } from "@/components/property/property-card";
import { toPropertyCardData } from "@/lib/property-presenters";
import { reconcileSearchTags } from "@/lib/search-filter-utils";
import type { AiSearchFilters, Property, SearchMode, Tag } from "@/types";

const PropertyMap = dynamic(() => import("@/components/property/property-map"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[28rem] place-items-center bg-olive-50 text-sm font-bold text-olive-800">
      <span><LoaderCircle className="mr-2 inline size-5 animate-spin" aria-hidden="true" /> Loading map…</span>
    </div>
  ),
});

interface SearchExperienceProps {
  searchText: string;
  initialMode: SearchMode;
  initialFilters: AiSearchFilters;
  initialProperties: Property[];
  availableTags: Tag[];
  initialError: string | null;
  initialCheckInDate?: string;
  initialCheckOutDate?: string;
}

function optionalNumber(value: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function SearchExperience({
  searchText,
  initialMode,
  initialFilters,
  initialProperties,
  availableTags,
  initialError,
  initialCheckInDate = "",
  initialCheckOutDate = "",
}: SearchExperienceProps) {
  const [keyword, setKeyword] = useState(initialFilters.keyword ?? "");
  const [location, setLocation] = useState(initialFilters.location ?? "");
  const [guests, setGuests] = useState(initialFilters.guests ? String(initialFilters.guests) : "");
  const [minPrice, setMinPrice] = useState(initialFilters.minPrice !== null ? String(initialFilters.minPrice) : "");
  const [maxPrice, setMaxPrice] = useState(initialFilters.maxPrice !== null ? String(initialFilters.maxPrice) : "");
  const [bedrooms, setBedrooms] = useState(initialFilters.bedrooms !== null ? String(initialFilters.bedrooms) : "");
  const [bathrooms, setBathrooms] = useState(initialFilters.bathrooms !== null ? String(initialFilters.bathrooms) : "");
  const [tags, setTags] = useState(initialFilters.tags ?? []);
  const [checkInDate, setCheckInDate] = useState(initialCheckInDate);
  const [checkOutDate, setCheckOutDate] = useState(initialCheckOutDate);
  const [properties, setProperties] = useState(initialProperties);
  const [searchError, setSearchError] = useState(initialError);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchMode, setSearchMode] = useState(initialMode);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [resetSignal, setResetSignal] = useState(0);
  const [isPending, startTransition] = useTransition();
  const isFirstRender = useRef(true);
  const latestRequest = useRef(0);
  const cards = useMemo(() => properties.map(toPropertyCardData), [properties]);
  const tagOptions = useMemo(() => {
    const options = new Map(availableTags.map((tag) => [tag.name.toLocaleLowerCase(), tag.name]));
    for (const tag of tags) options.set(tag.toLocaleLowerCase(), tag);
    return [...options.values()].sort((left, right) => left.localeCompare(right));
  }, [availableTags, tags]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const requestId = ++latestRequest.current;
    const timeout = window.setTimeout(() => {
      const completeDateRange = Boolean(checkInDate && checkOutDate);

      startTransition(async () => {
        const result = await searchPropertiesAction({
          keyword,
          location,
          guests: optionalNumber(guests),
          minPrice: optionalNumber(minPrice),
          maxPrice: optionalNumber(maxPrice),
          bedrooms: optionalNumber(bedrooms),
          bathrooms: optionalNumber(bathrooms),
          tags,
          checkInDate: completeDateRange ? checkInDate : undefined,
          checkOutDate: completeDateRange ? checkOutDate : undefined,
        });
        if (requestId !== latestRequest.current) return;
        if (!result.ok) {
          setSearchError(result.message);
          return;
        }
        setProperties(result.data);
        setSearchError(null);
      });
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [bathrooms, bedrooms, checkInDate, checkOutDate, guests, keyword, location, maxPrice, minPrice, tags]);

  async function handleHybridSearch(mode: SearchMode, query: string) {
    if (mode === "standard") {
      setKeyword(query);
      setSearchError(null);
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzeSearchAction(query);
      if (!result.ok) {
        setSearchError(result.message);
        return;
      }

      const filters = result.data;
      setKeyword(filters.keyword ?? "");
      setLocation(filters.location ?? "");
      setTags(reconcileSearchTags(filters.tags ?? [], availableTags));
      setMinPrice(filters.minPrice !== null ? String(filters.minPrice) : "");
      setMaxPrice(filters.maxPrice !== null ? String(filters.maxPrice) : "");
      setGuests(filters.guests != null ? String(filters.guests) : "");
      setBedrooms(filters.bedrooms !== null ? String(filters.bedrooms) : "");
      setBathrooms(filters.bathrooms !== null ? String(filters.bathrooms) : "");
      setCheckInDate(filters.checkInDate ?? "");
      setCheckOutDate(filters.checkOutDate ?? "");
      setSearchError(null);
    } finally {
      setIsAnalyzing(false);
    }
  }

  function toggleTag(tag: string) {
    setTags((current) => current.some((item) => item.toLocaleLowerCase() === tag.toLocaleLowerCase())
      ? current.filter((item) => item.toLocaleLowerCase() !== tag.toLocaleLowerCase())
      : [...current, tag]);
  }

  const hasActiveFilters = Boolean(
    keyword || location || guests || minPrice || maxPrice || bedrooms || bathrooms
    || tags.length || checkInDate || checkOutDate,
  );

  function clearFilters() {
    latestRequest.current += 1;
    setKeyword("");
    setLocation("");
    setTags([]);
    setGuests("");
    setMinPrice("");
    setMaxPrice("");
    setBedrooms("");
    setBathrooms("");
    setCheckInDate("");
    setCheckOutDate("");
    setSearchError(null);
    setResetSignal((current) => current + 1);
  }

  const labels = [
    keyword ? `“${keyword}”` : null,
    location || "All Marrakesh stays",
    guests ? `${guests} guest${guests === "1" ? "" : "s"}` : null,
    bedrooms ? `${bedrooms} bedroom${bedrooms === "1" ? "" : "s"}` : null,
    bathrooms ? `${bathrooms} bathroom${bathrooms === "1" ? "" : "s"}` : null,
    minPrice ? `From ${minPrice} MAD` : null,
    maxPrice ? `Up to ${maxPrice} MAD` : null,
    checkInDate && checkOutDate ? `${checkInDate} → ${checkOutDate}` : null,
    ...tags,
  ].filter((value): value is string => Boolean(value));

  const inputClassName = "mt-2 min-h-11 w-full rounded-2xl border border-sand-300 bg-sand-50 px-4 text-sm font-semibold normal-case tracking-normal text-ink outline-none transition focus:border-majorelle-500 focus:ring-4 focus:ring-majorelle-100";

  return (
    <div className="min-h-screen bg-sand-100">
      <section className="border-b border-sand-200 bg-sand-50">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div
            id="search-controls"
            aria-hidden={!filtersExpanded}
            inert={!filtersExpanded}
            className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${filtersExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
          >
            <div className="overflow-hidden">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-terracotta-600">
            <Sparkles className="size-4" aria-hidden="true" /> Hybrid property search
          </div>
          <div className="mt-4 max-w-5xl">
            <AiSearchBar
              key={resetSignal}
              defaultValue={resetSignal > 0 ? "" : searchText}
              defaultMode={searchMode}
              onModeChange={setSearchMode}
              onSearch={handleHybridSearch}
            />
          </div>

          <div className="mt-6 rounded-3xl border border-sand-200 bg-white p-4 shadow-card" aria-label="Manual search filters">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-sand-700">Refine your results</p>
                <p className="mt-1 text-xs text-sand-600">AI suggestions and manual changes use the same filters.</p>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={clearFilters}
                  disabled={!hasActiveFilters || isAnalyzing}
                  className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-terracotta-200 bg-terracotta-50 px-4 text-xs font-extrabold text-terracotta-700 transition hover:border-terracotta-300 hover:bg-terracotta-100 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta-400 focus-visible:ring-offset-2"
                >
                  <RotateCcw className="size-3.5" aria-hidden="true" /> Clear filters
                </button>
              </div>
            </div>

            <div
              id="manual-filter-fields"
              aria-hidden={!filtersExpanded}
              inert={!filtersExpanded}
              className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${filtersExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
            >
              <div className="overflow-hidden">
                <div className="grid gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs font-extrabold uppercase tracking-[0.12em] text-sand-700">
              Location name
              <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Marrakesh or neighborhood" maxLength={100} className={inputClassName} />
            </label>

            <div className="text-xs font-extrabold uppercase tracking-[0.12em] text-sand-700">
              Tags (amenities)
              <details className="group relative mt-2">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-2xl border border-sand-300 bg-sand-50 px-4 text-sm font-semibold normal-case tracking-normal text-ink outline-none transition hover:border-majorelle-300 focus-visible:border-majorelle-500 focus-visible:ring-4 focus-visible:ring-majorelle-100 [&::-webkit-details-marker]:hidden">
                  <span className="inline-flex items-center gap-2"><TagIcon className="size-4 text-olive-700" aria-hidden="true" />{tags.length ? `${tags.length} selected` : "Choose amenities"}</span>
                  <ChevronDown className="size-4 transition group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="absolute z-30 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-sand-200 bg-white p-2 shadow-float">
                  {tagOptions.length > 0 ? tagOptions.map((tag) => (
                    <label key={tag} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold normal-case tracking-normal text-sand-800 hover:bg-sand-100">
                      <input type="checkbox" checked={tags.some((item) => item.toLocaleLowerCase() === tag.toLocaleLowerCase())} onChange={() => toggleTag(tag)} className="size-4 rounded border-sand-300 text-majorelle-600 focus:ring-majorelle-400" />
                      {tag}
                    </label>
                  )) : <p className="px-3 py-2 text-sm font-medium normal-case tracking-normal text-sand-600">No property tags are available yet.</p>}
                </div>
              </details>
            </div>

            <label className="text-xs font-extrabold uppercase tracking-[0.12em] text-sand-700">
              Max persons
              <span className="relative mt-2 block">
                <UsersRound className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-sand-600" aria-hidden="true" />
                <input type="number" min={1} max={50} inputMode="numeric" value={guests} onChange={(event) => setGuests(event.target.value)} placeholder="Any" className={`${inputClassName} mt-0 pl-11`} />
              </span>
            </label>

            <label className="text-xs font-extrabold uppercase tracking-[0.12em] text-sand-700">
              Bedrooms
              <span className="relative mt-2 block">
                <BedDouble className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-sand-600" aria-hidden="true" />
                <input type="number" min={0} max={100} inputMode="numeric" value={bedrooms} onChange={(event) => setBedrooms(event.target.value)} placeholder="Any" className={`${inputClassName} mt-0 pl-11`} />
              </span>
            </label>

            <label className="text-xs font-extrabold uppercase tracking-[0.12em] text-sand-700">
              Bathrooms
              <span className="relative mt-2 block">
                <Bath className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-sand-600" aria-hidden="true" />
                <input type="number" min={0} max={100} inputMode="numeric" value={bathrooms} onChange={(event) => setBathrooms(event.target.value)} placeholder="Any" className={`${inputClassName} mt-0 pl-11`} />
              </span>
            </label>

            <label className="text-xs font-extrabold uppercase tracking-[0.12em] text-sand-700">
              Minimum price (MAD)
              <input type="number" min={0} step="50" inputMode="decimal" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} placeholder="No minimum" className={inputClassName} />
            </label>

            <label className="text-xs font-extrabold uppercase tracking-[0.12em] text-sand-700">
              Maximum price (MAD)
              <input type="number" min={0} step="50" inputMode="decimal" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} placeholder="No maximum" className={inputClassName} />
            </label>

            <label className="text-xs font-extrabold uppercase tracking-[0.12em] text-sand-700">
              Check-in
              <span className="relative mt-2 block">
                <CalendarDays className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-sand-600" aria-hidden="true" />
                <input type="date" value={checkInDate} onChange={(event) => setCheckInDate(event.target.value)} className={`${inputClassName} mt-0 pl-11 pr-3`} />
              </span>
            </label>

            <label className="text-xs font-extrabold uppercase tracking-[0.12em] text-sand-700">
              Check-out
              <span className="relative mt-2 block">
                <CalendarDays className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-sand-600" aria-hidden="true" />
                <input type="date" min={checkInDate || undefined} value={checkOutDate} onChange={(event) => setCheckOutDate(event.target.value)} className={`${inputClassName} mt-0 pl-11 pr-3`} />
              </span>
            </label>
                </div>
              </div>
            </div>
          </div>
            </div>
          </div>

          <div className={`flex items-center gap-3 transition-[margin] duration-300 ${filtersExpanded ? "mt-5" : "mt-0"}`}>
            <div className="hide-scrollbar flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-1" aria-label="Active filters">
              <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-bold text-white">
                {isPending || isAnalyzing ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : <SlidersHorizontal className="size-3.5" aria-hidden="true" />}
                {isAnalyzing ? "Translating with AI" : isPending ? "Updating" : "Active filters"}
              </span>
              {labels.map((filter) => <span key={filter} className="shrink-0 rounded-full border border-sand-300 bg-white px-4 py-2 text-xs font-bold text-sand-800">{filter}</span>)}
            </div>
            <button
              type="button"
              aria-expanded={filtersExpanded}
              aria-controls="search-controls"
              title={filtersExpanded ? "Collapse search controls" : "Expand search controls"}
              onClick={() => setFiltersExpanded((current) => !current)}
              className="grid size-10 shrink-0 place-items-center rounded-full border border-sand-300 bg-white text-sand-800 shadow-sm transition hover:border-majorelle-300 hover:bg-majorelle-50 hover:text-majorelle-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-majorelle-400 focus-visible:ring-offset-2"
            >
              <span className="sr-only">{filtersExpanded ? "Collapse search controls" : "Expand search controls"}</span>
              <ChevronDown className={`size-4 transition-transform duration-300 ${filtersExpanded ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-[1600px] lg:grid-cols-[minmax(0,0.9fr)_minmax(430px,1.1fr)]">
        <section className="px-4 py-8 sm:px-6 lg:px-8 lg:py-10" aria-labelledby="search-results-title" aria-busy={isPending || isAnalyzing}>
          <div className="mb-7">
            <p className="eyebrow">{searchError ? "Search needs attention" : `${cards.length} thoughtful match${cards.length === 1 ? "" : "es"}`}</p>
            <h1 id="search-results-title" className="mt-2 font-serif text-4xl font-semibold text-ink">Stays that understand you.</h1>
          </div>

          {searchError && <div className="mb-5 rounded-3xl border border-terracotta-200 bg-terracotta-50 p-5 text-sm leading-6 text-terracotta-900" role="alert">{searchError}</div>}

          {cards.length > 0 ? (
            <div className={`space-y-5 transition ${isPending ? "opacity-60" : "opacity-100"}`}>
              {cards.map((property, index) => <PropertyCard key={property.id} property={property} compact eager={index === 0} />)}
            </div>
          ) : !searchError ? (
            <div className="rounded-3xl border border-sand-200 bg-sand-50 p-8 text-center shadow-card">
              <SearchX className="mx-auto size-8 text-terracotta-500" aria-hidden="true" />
              <h2 className="mt-4 font-serif text-2xl font-semibold text-ink">No exact match yet.</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-sand-700">Try a nearby neighborhood, fewer tags, or different dates.</p>
            </div>
          ) : null}
        </section>

        <aside className="relative z-0 h-[28rem] overflow-hidden border-y border-sand-200 bg-olive-50 lg:sticky lg:top-20 lg:h-[calc(100vh-5rem)] lg:min-h-[calc(100vh-5rem)] lg:border-l lg:border-y-0" aria-label="Map of search results">
          <PropertyMap properties={properties} location={location} />
        </aside>
      </div>
    </div>
  );
}
