import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bath, BedDouble, Check, ExternalLink, MapPin, Star, UsersRound } from "lucide-react";

import { BookingSidebar } from "@/components/booking/booking-sidebar";
import { PropertyMediaViewer } from "@/components/property/property-media-viewer";
import { PropertyReviews } from "@/components/property/property-reviews";
import { PropertyStaticMapShell } from "@/components/property/property-static-map-shell";
import { FavoriteButton } from "@/components/wishlist/favorite-button";
import { getOptionalProfile } from "@/lib/management";
import { getBlockedDates, getProperty, getPropertyReviews } from "@/lib/properties";

export async function generateMetadata({ params }: PageProps<"/properties/[id]">): Promise<Metadata> {
  const { id } = await params;
  try {
    const property = await getProperty(id);
    if (!property) return { title: "Property not found" };
    const image = property.media.find((item) => item.type === "IMAGE")?.url;
    const description =
      property.description?.slice(0, 155) ??
      `${property.title}, a ${property.bedrooms}-bedroom stay in ${property.city}.`;
    return {
      title: property.title,
      description,
      openGraph: {
        title: `${property.title} | KEYRAK`,
        description,
        images: image ? [{ url: image, alt: `${property.title} in ${property.city}` }] : [],
      },
      twitter: {
        card: "summary_large_image",
        title: `${property.title} | KEYRAK`,
        description,
        images: image ? [image] : [],
      },
    };
  } catch {
    return { title: "Property unavailable" };
  }
}

export default async function PropertyPage({ params }: PageProps<"/properties/[id]">) {
  const { id } = await params;
  const property = await getProperty(id);
  if (!property) notFound();
  const [availability, reviewData, currentProfile] = await Promise.all([
    getBlockedDates(property.id),
    getPropertyReviews(property.id),
    getOptionalProfile(),
  ]);
  const amenities = property.tags.map((tag) => tag.name);
  const averageRating = reviewData.reviews.length > 0
    ? reviewData.reviews.reduce((sum, review) => sum + review.rating, 0) / reviewData.reviews.length
    : null;

  return (
    <div className="bg-sand-100">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/search" className="inline-flex items-center gap-2 text-sm font-bold text-sand-700 transition hover:text-majorelle-700">
            <ArrowLeft className="size-4" aria-hidden="true" /> Back to search
          </Link>
          <FavoriteButton propertyId={property.id} title={property.title} variant="label" />
        </div>

        <div className="mt-7 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start">
          <div className="min-w-0">
            <PropertyMediaViewer media={property.media} title={property.title} />

            <section className="mt-8 border-b border-sand-200 pb-8">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                <div>
                  <p className="eyebrow">{property.propertyType.toLowerCase()} · KEYRAK stays</p>
                  <h1 className="mt-2 font-serif text-5xl font-semibold leading-none text-ink sm:text-6xl">{property.title}</h1>
                  <p className="mt-4 flex items-center gap-2 text-sm font-medium text-sand-700">
                    <MapPin className="size-4 text-terracotta-600" aria-hidden="true" /> {property.address}, {property.city}
                  </p>
                </div>
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-sand-200 bg-sand-50 px-4 py-2 text-sm font-bold text-ink">
                  <Star className="size-4 fill-terracotta-400 text-terracotta-400" aria-hidden="true" />
                  {!reviewData.available ? "Reviews unavailable" : averageRating === null ? "New · No reviews yet" : `${averageRating.toFixed(1)} · ${reviewData.reviews.length} verified review${reviewData.reviews.length === 1 ? "" : "s"}`}
                </span>
              </div>
              <div className="mt-7 flex flex-wrap gap-3 text-sm font-semibold text-sand-800">
                <span className="inline-flex items-center gap-2 rounded-full bg-sand-200/70 px-4 py-2"><UsersRound className="size-4" />{property.maxGuests} guests</span>
                <span className="inline-flex items-center gap-2 rounded-full bg-sand-200/70 px-4 py-2"><BedDouble className="size-4" />{property.bedrooms} bedrooms</span>
                <span className="inline-flex items-center gap-2 rounded-full bg-sand-200/70 px-4 py-2"><Bath className="size-4" />{property.bathrooms} bathrooms</span>
              </div>
            </section>

            <section className="border-b border-sand-200 py-9">
              <p className="eyebrow">The story of this stay</p>
              <h2 className="mt-2 font-serif text-3xl font-semibold text-ink">A considered Marrakesh home.</h2>
              <p className="mt-5 max-w-3xl whitespace-pre-line text-base leading-8 text-sand-800">
                {property.description ?? "This property’s full story is being prepared by the host."}
              </p>
            </section>

            <section className="border-b border-sand-200 py-9">
              <p className="eyebrow">Where you will stay</p>
              <h2 className="mt-2 font-serif text-3xl font-semibold text-ink">A place in {property.city}.</h2>
              <p className="mt-3 flex items-center gap-2 text-sm font-medium text-sand-700">
                <MapPin className="size-4 text-terracotta-600" aria-hidden="true" />
                {property.address}, {property.city}
              </p>
              <div className="mt-6 overflow-hidden rounded-arch border border-sand-200 bg-sand-50 shadow-card">
                <PropertyStaticMapShell
                  latitude={Number(property.latitude)}
                  longitude={Number(property.longitude)}
                  title={property.title}
                />
              </div>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${property.latitude},${property.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-majorelle-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-majorelle-700 focus:outline-none focus:ring-2 focus:ring-majorelle-500 focus:ring-offset-2"
              >
                View on Google Maps
                <ExternalLink className="size-4" aria-hidden="true" />
              </a>
            </section>

            <section className="py-9">
              <p className="eyebrow">What this place offers</p>
              <h2 className="mt-2 font-serif text-3xl font-semibold text-ink">Comfort, with local character.</h2>
              {amenities.length > 0 ? (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {amenities.map((amenity) => (
                    <div key={amenity} className="flex items-center gap-3 rounded-2xl border border-sand-200 bg-sand-50 px-4 py-3 text-sm font-semibold text-sand-800">
                      <span className="grid size-7 place-items-center rounded-full bg-olive-100 text-olive-700">
                        <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
                      </span>
                      {amenity}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-5 text-sm text-sand-700">The host is still adding this home’s amenities.</p>
              )}
            </section>

            <PropertyReviews
              propertyId={property.id}
              initialReviews={reviewData.reviews}
              currentUserId={currentProfile?.id}
              isAdmin={currentProfile?.role === "ADMIN"}
              available={reviewData.available}
            />
          </div>

          <div className="min-w-0 lg:sticky lg:top-28">
            <BookingSidebar
              propertyId={property.id}
              propertyTitle={property.title}
              pricePerNight={Number(property.pricePerNight)}
              maxGuests={property.maxGuests}
              blockedDates={availability.blockedDates}
              availabilityReady={availability.availabilityReady}
              hasSavedIdCard={Boolean(currentProfile?.idCardUrl)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
