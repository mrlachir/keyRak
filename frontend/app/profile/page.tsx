import type { Metadata } from "next";
import { CalendarDays, MapPin, Palmtree, UsersRound } from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/components/booking/status-badge";
import { requireAuthenticatedSession } from "@/lib/access";
import { getMyTrips } from "@/lib/management";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your trips",
  description: "View your KEYRAK reservation history and booking status.",
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(`${value}T12:00:00`),
  );
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const session = await requireAuthenticatedSession("/profile");
  const [trips, query] = await Promise.all([getMyTrips(), searchParams]);

  return (
    <div className="zellige-overlay min-h-[70vh] bg-hero-glow px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="mx-auto w-full max-w-6xl">
        <p className="eyebrow">Client portal</p>
        <h1 className="mt-3 font-serif text-5xl font-semibold leading-none text-ink sm:text-6xl">Your Marrakesh journeys.</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-sand-700">
          Welcome back, {session.user.name ?? session.user.email}. Track every request from submission through host confirmation.
        </p>

        {query.notice === "admin-access-required" && (
          <p className="mt-7 rounded-2xl border border-terracotta-200 bg-terracotta-50 px-5 py-4 text-sm font-semibold text-terracotta-900" role="alert">
            This account does not have administrator access. Your personal trips remain available below.
          </p>
        )}

        {trips.length === 0 ? (
          <section className="surface-card mt-10 rounded-[2rem] px-6 py-16 text-center">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-terracotta-100 text-terracotta-700"><Palmtree className="size-7" aria-hidden="true" /></span>
            <h2 className="mt-5 font-serif text-3xl font-semibold text-ink">Your first stay is still waiting.</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-sand-700">Explore the marketplace, choose available dates, and your request will appear here instantly.</p>
            <Link href="/search" className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-majorelle-600 px-6 text-sm font-bold text-white transition hover:bg-majorelle-700">Explore stays</Link>
          </section>
        ) : (
          <div className="mt-10 grid gap-5">
            {trips.map((trip) => (
              <article key={trip.id} className="surface-card grid gap-6 rounded-[2rem] p-6 md:grid-cols-[1fr_auto] md:items-center sm:p-7">
                <div>
                  <div className="flex flex-wrap items-center gap-3"><StatusBadge status={trip.status} /><span className="text-xs font-semibold text-sand-600">Requested {formatDate(trip.createdAt.slice(0, 10))}</span></div>
                  <Link href={`/properties/${trip.propertyId}`} className="mt-4 inline-block font-serif text-3xl font-semibold text-ink transition hover:text-majorelle-700">{trip.propertyTitle}</Link>
                  <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-sand-700"><MapPin className="size-4 text-terracotta-600" aria-hidden="true" /> {trip.propertyCity}</p>
                  <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm text-sand-700">
                    <span className="inline-flex items-center gap-2"><CalendarDays className="size-4 text-majorelle-600" aria-hidden="true" /> {formatDate(trip.checkInDate)} — {formatDate(trip.checkOutDate)}</span>
                    <span className="inline-flex items-center gap-2"><UsersRound className="size-4 text-olive-600" aria-hidden="true" /> {trip.adults + trip.children} guest{trip.adults + trip.children === 1 ? "" : "s"}</span>
                  </div>
                </div>
                <div className="border-t border-sand-200 pt-5 text-left md:border-l md:border-t-0 md:pl-8 md:pt-0 md:text-right">
                  <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-sand-600">Stay total</p>
                  <p className="mt-2 font-serif text-3xl font-bold text-ink">{formatPrice(Number(trip.totalPrice))}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
