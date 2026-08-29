import "server-only";

import { cache } from "react";

import { ApiError, apiFetch } from "@/lib/api";
import { featuredProperties } from "@/lib/featured-properties";
import type {
  AiSearchFilters,
  BlockedDatesResponse,
  Property,
  PropertyMedia,
  PropertySearchFilters,
  Tag,
} from "@/types";

const fallbackTimestamp = "2026-01-01T00:00:00.000Z";

function demoProperty(id: string): Property | null {
  const property = featuredProperties.find((item) => item.id === id);
  if (!property) return null;

  const media: PropertyMedia[] = [property, ...featuredProperties.filter((item) => item.id !== property.id)]
    .map((item, index) => ({
      id: `${property.id}-image-${index}`,
      url: item.imageUrl,
      type: "IMAGE" as const,
      displayOrder: index,
      createdAt: fallbackTimestamp,
    }));

  return {
    id: property.id,
    title: property.title,
    description:
      "A locally reviewed Marrakesh stay shaped by filtered light, quiet corners, and thoughtful hosting.",
    propertyType: property.propertyType,
    address: property.location,
    city: "Marrakesh",
    pricePerNight: property.pricePerNight,
    latitude: 31.6295,
    longitude: -7.9811,
    maxGuests: property.guests,
    bedrooms: property.bedrooms,
    bathrooms: Math.max(1, property.bedrooms),
    active: true,
    media,
    tags: property.tags.map((name, index) => ({ id: index + 1, name })),
    createdAt: fallbackTimestamp,
    updatedAt: fallbackTimestamp,
  };
}

export const getProperty = cache(async (id: string): Promise<Property | null> => {
  try {
    return await apiFetch<Property>(`/api/properties/${encodeURIComponent(id)}`, {
      authenticated: false,
    });
  } catch (error) {
    const fallback = demoProperty(id);
    if (fallback && (error instanceof ApiError || error instanceof TypeError)) {
      return fallback;
    }
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
});

export async function analyzeSearch(query: string): Promise<AiSearchFilters> {
  return apiFetch<AiSearchFilters>("/api/ai/search", {
    method: "POST",
    authenticated: false,
    body: JSON.stringify({ query }),
  });
}

export async function searchProperties(filters: PropertySearchFilters): Promise<Property[]> {
  const parameters = new URLSearchParams();
  if (filters.keyword) parameters.set("keyword", filters.keyword);
  if (filters.location) parameters.set("location", filters.location);
  if (filters.guests) parameters.set("guests", String(filters.guests));
  if (filters.minPrice !== undefined) parameters.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice !== undefined) parameters.set("maxPrice", String(filters.maxPrice));
  if (filters.bedrooms !== undefined && filters.bedrooms !== null) {
    parameters.set("bedrooms", String(filters.bedrooms));
  }
  if (filters.bathrooms !== undefined && filters.bathrooms !== null) {
    parameters.set("bathrooms", String(filters.bathrooms));
  }
  if (filters.checkInDate) parameters.set("checkInDate", filters.checkInDate);
  if (filters.checkOutDate) parameters.set("checkOutDate", filters.checkOutDate);
  for (const tag of filters.tags ?? []) {
    parameters.append("tags", tag);
  }
  const queryString = parameters.toString();
  return apiFetch<Property[]>(`/api/properties/search${queryString ? `?${queryString}` : ""}`, {
    authenticated: false,
  });
}

export async function getPropertyTags(): Promise<Tag[]> {
  return apiFetch<Tag[]>("/api/properties/tags", {
    authenticated: false,
  });
}

export async function getBlockedDates(propertyId: string): Promise<{
  blockedDates: string[];
  availabilityReady: boolean;
}> {
  try {
    const response = await apiFetch<BlockedDatesResponse>(
      `/api/properties/${encodeURIComponent(propertyId)}/blocked-dates`,
      { authenticated: false },
    );
    return { blockedDates: response.blockedDates, availabilityReady: true };
  } catch {
    return { blockedDates: [], availabilityReady: false };
  }
}
