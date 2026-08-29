import Link from "next/link";
import { ArrowUpRight, BedDouble, Star, UsersRound } from "lucide-react";

import { cn, formatPrice } from "@/lib/utils";
import { PropertyImage } from "@/components/property/property-image";
import type { PropertyCardData } from "@/types";

export function PropertyCard({
  property,
  compact = false,
  eager = false,
}: {
  property: PropertyCardData;
  compact?: boolean;
  eager?: boolean;
}) {
  return (
    <article
      className={cn(
        "group overflow-hidden border border-sand-200 bg-sand-50 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-float",
        compact ? "grid rounded-3xl sm:grid-cols-[12rem_1fr]" : "rounded-arch",
      )}
    >
      <Link
        href={`/properties/${property.id}`}
        className={cn("relative block overflow-hidden", compact ? "min-h-52 sm:min-h-full" : "aspect-[4/3]")}
      >
        <PropertyImage
          src={property.imageUrl}
          alt={property.imageAlt}
          fill
          loading={eager ? "eager" : "lazy"}
          sizes={compact ? "(max-width: 640px) 100vw, 12rem" : "(max-width: 768px) 100vw, 33vw"}
          className="object-cover transition duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/35 via-transparent to-transparent" />
        <span className="absolute left-4 top-4 rounded-full bg-sand-50/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-terracotta-700 backdrop-blur">
          {property.propertyType.toLowerCase()}
        </span>
      </Link>
      <div className={cn("p-5", compact && "flex flex-col justify-center") }>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-sand-700">{property.location}</p>
            <Link href={`/properties/${property.id}`} className="mt-1 inline-flex items-center gap-1.5">
              <h3 className="font-serif text-2xl font-semibold text-ink transition group-hover:text-terracotta-700">
                {property.title}
              </h3>
              <ArrowUpRight className="size-4 text-terracotta-500" aria-hidden="true" />
            </Link>
          </div>
          <span className="flex shrink-0 items-center gap-1 text-sm font-bold text-ink">
            <Star className="size-4 fill-terracotta-400 text-terracotta-400" aria-hidden="true" />
            {property.rating}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {property.tags.slice(0, compact ? 2 : 3).map((tag) => (
            <span key={tag} className="rounded-full bg-olive-50 px-3 py-1 text-xs font-semibold text-olive-800">
              {tag}
            </span>
          ))}
        </div>
        <div className="mt-5 flex items-end justify-between gap-4 border-t border-sand-200 pt-4">
          <div className="flex items-center gap-3 text-xs font-semibold text-sand-700">
            <span className="inline-flex items-center gap-1"><UsersRound className="size-4" />{property.guests}</span>
            <span className="inline-flex items-center gap-1"><BedDouble className="size-4" />{property.bedrooms}</span>
          </div>
          <p className="text-right text-sm text-sand-700">
            <span className="font-serif text-xl font-bold text-ink">{formatPrice(property.pricePerNight)}</span>
            <span className="block text-xs">per night</span>
          </p>
        </div>
      </div>
    </article>
  );
}
