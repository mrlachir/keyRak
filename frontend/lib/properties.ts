import "server-only";

import { cache } from "react";

import { ApiError, apiFetch } from "@/lib/api";
import { featuredProperties } from "@/lib/featured-properties";
import type {
  AiSearchFilters,
  BlockedDatesResponse,
  Property,
  PropertyCardData,
  PropertyMedia,
} from "@/types";

const fallbackTimestamp = "2026-01-01T00:00:00.000Z";

function demoProperty(id: string): Property | null {
  const property = featuredProperties.find((item) => item.id === id);
  if (!property) return null;

  const media: PropertyMedia[] = [
    {
      id: `${property.id}-image`,
      url: property.imageUrl,
      type: "IMAGE",
      displayOrder: 0,
      createdAt: fallbackTimestamp,
    },
  ];

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

export async function searchProperties(filters: Partial<AiSearchFilters>): Promise<Property[]> {
  const parameters = new URLSearchParams();
  if (filters.location) parameters.set("location", filters.location);
  if (filters.guests) parameters.set("guests", String(filters.guests));
  for (const amenity of filters.amenities ?? []) {
    parameters.append("amenities", amenity);
  }
  const queryString = parameters.toString();
  return apiFetch<Property[]>(`/api/properties/search${queryString ? `?${queryString}` : ""}`, {
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

export function toPropertyCardData(property: Property): PropertyCardData {
  const image = property.media.find((item) => item.type === "IMAGE") ?? property.media[0];
  return {
    id: property.id,
    title: property.title,
    location: `${property.address}, ${property.city}`,
    pricePerNight: Number(property.pricePerNight),
    rating: 4.9,
    imageUrl: image?.url ?? "/properties/riad-courtyard.jpg",
    imageAlt: `${property.title} in ${property.city}`,
    guests: property.maxGuests,
    bedrooms: property.bedrooms,
    tags: property.tags.map((tag) => tag.name),
    propertyType: property.propertyType,
  };
}
