import type { Metadata } from "next";
import { Palmtree } from "lucide-react";
import Link from "next/link";

import { ProfileBookingList } from "@/components/profile/profile-booking-list";
import { ProfileEditor } from "@/components/profile/profile-editor";
import { ProfileIdCard } from "@/components/profile/profile-id-card";
import { getMyProfile, getMyTrips } from "@/lib/management";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your trips",
  description: "View your KEYRAK reservation history and booking status.",
};

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const [profile, trips, query] = await Promise.all([getMyProfile(), getMyTrips(), searchParams]);

  return (
    <div className="zellige-overlay min-h-[70vh] bg-hero-glow px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="mx-auto w-full max-w-6xl">
        <p className="eyebrow">Client portal</p>
        <h1 className="mt-3 font-serif text-5xl font-semibold leading-none text-ink sm:text-6xl">Your Marrakesh journeys.</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-sand-700">
          Welcome back, {profile.displayName ?? profile.email}. Keep your contact details current and track every request from submission through host confirmation.
        </p>

        {query.notice === "admin-access-required" && (
          <p className="mt-7 rounded-2xl border border-terracotta-200 bg-terracotta-50 px-5 py-4 text-sm font-semibold text-terracotta-900" role="alert">
            This account does not have administrator access. Your personal trips remain available below.
          </p>
        )}

        <ProfileEditor profile={profile} />
        <ProfileIdCard hasIdCard={Boolean(profile.idCardUrl)} />

        {trips.length === 0 ? (
          <section className="surface-card mt-10 rounded-[2rem] px-6 py-16 text-center">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-terracotta-100 text-terracotta-700"><Palmtree className="size-7" aria-hidden="true" /></span>
            <h2 className="mt-5 font-serif text-3xl font-semibold text-ink">Your first stay is still waiting.</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-sand-700">Explore the marketplace, choose available dates, and your request will appear here instantly.</p>
            <Link href="/search" className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-majorelle-600 px-6 text-sm font-bold text-white transition hover:bg-majorelle-700">Explore stays</Link>
          </section>
        ) : <ProfileBookingList trips={trips} />}
      </div>
    </div>
  );
}
