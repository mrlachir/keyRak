import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bath, BedDouble, Check, MapPin, Star, UsersRound } from "lucide-react";

import { BookingSidebar } from "@/components/booking/booking-sidebar";
import { PropertyMediaViewer } from "@/components/property/property-media-viewer";
import { getBlockedDates, getProperty } from "@/lib/properties";

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
  const availability = await getBlockedDates(property.id);
  const amenities = property.tags.map((tag) => tag.name);

  return (
    <div className="bg-sand-100">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <Link href="/search" className="inline-flex items-center gap-2 text-sm font-bold text-sand-700 transition hover:text-majorelle-700">
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to search
        </Link>

        <div className="mt-7 grid gap-10 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start">
          <div>
            <PropertyMediaViewer media={property.media} title={property.title} />

            <section className="mt-8 border-b border-sand-200 pb-8">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                <div>
                  <p className="eyebrow">{property.propertyType.toLowerCase()} · Locally reviewed</p>
                  <h1 className="mt-2 font-serif text-5xl font-semibold leading-none text-ink sm:text-6xl">{property.title}</h1>
                  <p className="mt-4 flex items-center gap-2 text-sm font-medium text-sand-700">
                    <MapPin className="size-4 text-terracotta-600" aria-hidden="true" /> {property.address}, {property.city}
                  </p>
                </div>
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-sand-200 bg-sand-50 px-4 py-2 text-sm font-bold text-ink">
                  <Star className="size-4 fill-terracotta-400 text-terracotta-400" aria-hidden="true" />
                  4.9 · Locally reviewed
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
          </div>

          <div className="lg:sticky lg:top-28">
            <BookingSidebar
              propertyId={property.id}
              propertyTitle={property.title}
              pricePerNight={Number(property.pricePerNight)}
              maxGuests={property.maxGuests}
              blockedDates={availability.blockedDates}
              availabilityReady={availability.availabilityReady}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
