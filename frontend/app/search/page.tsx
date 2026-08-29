import type { Metadata } from "next";

import { SearchExperience } from "@/components/property/search-experience";
import { analyzeSearch, getPropertyTags, searchProperties } from "@/lib/properties";
import { reconcileSearchTags } from "@/lib/search-filter-utils";
import type { AiSearchFilters, Property, PropertySearchFilters, SearchMode } from "@/types";

export const metadata: Metadata = {
  title: "Search stays",
  description: "Explore AI-matched Marrakesh rentals alongside their neighborhoods.",
};

function firstValue(value: string | string[] | undefined, maximumLength = 500): string {
  const selected = Array.isArray(value) ? value[0] : value;
  return selected?.trim().slice(0, maximumLength) ?? "";
}

function positiveInteger(value: string): number | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 50 ? parsed : undefined;
}

function nonNegativeDecimal(value: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function nonNegativeInteger(value: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 100 ? parsed : undefined;
}

function stringValues(value: string | string[] | undefined): string[] {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return values
    .map((item) => item.trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, 30);
}

function isoDate(value: string | null | undefined): string {
  const normalized = value?.trim() ?? "";
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : "";
}

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const parameters = await searchParams;
  const query = firstValue(parameters.q);
  const mode: SearchMode = firstValue(parameters.mode, 8) === "ai" ? "ai" : "standard";
  const manualLocation = firstValue(parameters.location, 100);
  const manualGuests = positiveInteger(firstValue(parameters.guests, 3));
  const manualMinPrice = nonNegativeDecimal(firstValue(parameters.minPrice, 12));
  const manualMaxPrice = nonNegativeDecimal(firstValue(parameters.maxPrice, 12));
  const manualBedrooms = nonNegativeInteger(firstValue(parameters.bedrooms, 3));
  const manualBathrooms = nonNegativeInteger(firstValue(parameters.bathrooms, 3));
  const manualTags = stringValues(parameters.tags);
  const checkInDate = firstValue(parameters.checkInDate, 10);
  const checkOutDate = firstValue(parameters.checkOutDate, 10);
  const availableTagsPromise = getPropertyTags().catch(() => []);
  let filters: AiSearchFilters | null = null;
  let searchError: string | null = null;

  if (mode === "ai" && query) {
    try {
      filters = await analyzeSearch(query);
    } catch {
      searchError = "We could not translate that request with AI, but you can still refine the manual filters below.";
    }
  }
  const availableTags = await availableTagsPromise;
  const selectedTags = manualTags.length > 0
    ? manualTags
    : reconcileSearchTags(filters?.tags ?? [], availableTags);
  const resolvedCheckInDate = checkInDate || isoDate(filters?.checkInDate);
  const resolvedCheckOutDate = checkOutDate || isoDate(filters?.checkOutDate);
  const completeDateRange = Boolean(resolvedCheckInDate && resolvedCheckOutDate);

  const initialSearch: PropertySearchFilters = {
    keyword: mode === "standard" ? query || undefined : filters?.keyword || undefined,
    location: manualLocation || filters?.location || undefined,
    guests: manualGuests ?? filters?.guests,
    minPrice: manualMinPrice ?? filters?.minPrice ?? undefined,
    maxPrice: manualMaxPrice ?? filters?.maxPrice ?? undefined,
    bedrooms: manualBedrooms ?? filters?.bedrooms ?? undefined,
    bathrooms: manualBathrooms ?? filters?.bathrooms ?? undefined,
    tags: selectedTags,
    checkInDate: completeDateRange ? resolvedCheckInDate : undefined,
    checkOutDate: completeDateRange ? resolvedCheckOutDate : undefined,
  };

  let properties: Property[] = [];
  try {
    properties = await searchProperties(initialSearch);
  } catch {
    searchError = "The property service is temporarily unavailable. Check the Spring Boot API and try again.";
  }
  const initialFilters: AiSearchFilters = {
    keyword: initialSearch.keyword ?? "",
    location: initialSearch.location ?? "",
    tags: initialSearch.tags ?? [],
    minPrice: initialSearch.minPrice ?? null,
    maxPrice: initialSearch.maxPrice ?? null,
    guests: initialSearch.guests ?? null,
    bedrooms: initialSearch.bedrooms ?? null,
    bathrooms: initialSearch.bathrooms ?? null,
    checkInDate: resolvedCheckInDate || null,
    checkOutDate: resolvedCheckOutDate || null,
  };

  return (
    <SearchExperience
      searchText={query}
      initialMode={mode}
      initialFilters={initialFilters}
      initialProperties={properties}
      availableTags={availableTags}
      initialError={searchError}
      initialCheckInDate={resolvedCheckInDate}
      initialCheckOutDate={resolvedCheckOutDate}
    />
  );
}
