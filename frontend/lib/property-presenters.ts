import type { Property, PropertyCardData } from "@/types";

export function toPropertyCardData(property: Property): PropertyCardData {
  const image = property.media.find((item) => item.type === "IMAGE");

  return {
    id: property.id,
    title: property.title,
    location: `${property.address}, ${property.city}`,
    pricePerNight: Number(property.pricePerNight),
    rating: 4.9,
    imageUrl: image?.url ?? "/properties/image-unavailable.svg",
    imageAlt: `${property.title} in ${property.city}`,
    guests: property.maxGuests,
    bedrooms: property.bedrooms,
    tags: property.tags.map((tag) => tag.name),
    propertyType: property.propertyType,
  };
}
