"use server";

import { apiErrorMessage } from "@/lib/api";
import { analyzeSearch, searchProperties } from "@/lib/properties";
import type { ActionResult, AiSearchFilters, Property, PropertySearchFilters } from "@/types";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export async function searchPropertiesAction(
  input: PropertySearchFilters,
): Promise<ActionResult<Property[]>> {
  const keyword = input.keyword?.trim().slice(0, 200) || undefined;
  const location = input.location?.trim().slice(0, 100) || undefined;
  const guests = input.guests ?? undefined;
  const minPrice = input.minPrice;
  const maxPrice = input.maxPrice;
  const bedrooms = input.bedrooms ?? undefined;
  const bathrooms = input.bathrooms ?? undefined;
  const tags = (input.tags ?? [])
    .map((value) => value.trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, 30);

  if (guests !== undefined && (!Number.isInteger(guests) || guests < 1 || guests > 50)) {
    return { ok: false, message: "Guests must be a whole number between 1 and 50." };
  }
  if (minPrice !== undefined && (!Number.isFinite(minPrice) || minPrice < 0)) {
    return { ok: false, message: "Minimum nightly price must be a positive number." };
  }
  if (maxPrice !== undefined && (!Number.isFinite(maxPrice) || maxPrice < 0)) {
    return { ok: false, message: "Maximum nightly price must be a positive number." };
  }
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    return { ok: false, message: "Minimum nightly price cannot be greater than maximum nightly price." };
  }
  if (bedrooms !== undefined && (!Number.isInteger(bedrooms) || bedrooms < 0 || bedrooms > 100)) {
    return { ok: false, message: "Bedrooms must be a whole number between 0 and 100." };
  }
  if (bathrooms !== undefined && (!Number.isInteger(bathrooms) || bathrooms < 0 || bathrooms > 100)) {
    return { ok: false, message: "Bathrooms must be a whole number between 0 and 100." };
  }

  const hasCheckIn = Boolean(input.checkInDate);
  const hasCheckOut = Boolean(input.checkOutDate);
  if (hasCheckIn !== hasCheckOut) {
    return { ok: false, message: "Choose both check-in and check-out dates." };
  }
  if (
    hasCheckIn &&
    (!datePattern.test(input.checkInDate ?? "") ||
      !datePattern.test(input.checkOutDate ?? "") ||
      (input.checkOutDate ?? "") <= (input.checkInDate ?? ""))
  ) {
    return { ok: false, message: "Choose a check-out date after check-in." };
  }

  try {
    const properties = await searchProperties({
      keyword,
      location,
      guests,
      minPrice,
      maxPrice,
      bedrooms,
      bathrooms,
      tags,
      checkInDate: input.checkInDate,
      checkOutDate: input.checkOutDate,
    });
    return { ok: true, data: properties };
  } catch (error) {
    return {
      ok: false,
      message: apiErrorMessage(error, "The properties could not be refreshed."),
    };
  }
}

export async function analyzeSearchAction(query: string): Promise<ActionResult<AiSearchFilters>> {
  const normalizedQuery = query.trim().slice(0, 500);
  if (normalizedQuery.length < 3) {
    return { ok: false, message: "Describe your ideal stay using at least three characters." };
  }

  try {
    return { ok: true, data: await analyzeSearch(normalizedQuery) };
  } catch (error) {
    return {
      ok: false,
      message: apiErrorMessage(error, "We could not translate that request with AI."),
    };
  }
}
