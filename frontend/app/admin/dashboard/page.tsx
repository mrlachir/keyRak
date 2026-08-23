import type { Metadata } from "next";
import { Banknote, Building2, CalendarClock, ChevronRight, PlusCircle } from "lucide-react";
import Link from "next/link";

import { formatPrice } from "@/lib/utils";
import { getAdminDashboardMetrics } from "@/lib/management";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin overview",
  description: "Monitor KEYRAK inventory, booking requests, and confirmed booking value.",
};

export default async function AdminDashboardPage() {
  const metrics = await getAdminDashboardMetrics();
  const cards = [
    {
      label: "Active properties",
      value: metrics.totalActiveProperties.toLocaleString("en"),
      detail: "Published and available to search",
      icon: Building2,
      tone: "bg-terracotta-100 text-terracotta-700",
    },
    {
      label: "Pending requests",
      value: metrics.pendingBookingRequests.toLocaleString("en"),
      detail: "Awaiting a host decision",
      icon: CalendarClock,
      tone: "bg-majorelle-100 text-majorelle-700",
    },
    {
      label: "Estimated revenue",
      value: formatPrice(Number(metrics.estimatedRevenue)),
      detail: "Confirmed booking value",
      icon: Banknote,
      tone: "bg-olive-100 text-olive-700",
    },
  ];

  return (
    <div className="zellige-overlay bg-hero-glow px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="mx-auto w-full max-w-7xl">
        <p className="eyebrow">Management overview</p>
        <div className="mt-3 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <h1 className="font-serif text-5xl font-semibold leading-none text-ink sm:text-6xl">The marketplace at a glance.</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-sand-700">
              Live operational totals calculated by Spring Boot from active inventory and booking status.
            </p>
          </div>
          <Link href="/admin/properties/new" className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-full bg-majorelle-600 px-5 text-sm font-bold text-white shadow-lg shadow-majorelle-900/15 transition hover:-translate-y-0.5 hover:bg-majorelle-700 lg:self-auto">
            <PlusCircle className="size-4" aria-hidden="true" /> Add property
          </Link>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {cards.map(({ label, value, detail, icon: Icon, tone }) => (
            <article key={label} className="surface-card rounded-[2rem] p-6 sm:p-7">
              <span className={`grid size-12 place-items-center rounded-2xl ${tone}`}><Icon className="size-6" aria-hidden="true" /></span>
              <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.14em] text-sand-600">{label}</p>
              <p className="mt-2 font-serif text-4xl font-bold text-ink">{value}</p>
              <p className="mt-2 text-sm text-sand-600">{detail}</p>
            </article>
          ))}
        </div>

        <Link href="/admin/bookings" className="mt-8 flex items-center justify-between gap-4 rounded-[2rem] border border-majorelle-200 bg-majorelle-50 p-6 text-majorelle-950 shadow-card transition hover:border-majorelle-300 sm:p-7">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-majorelle-600">Booking control</p>
            <p className="mt-2 font-serif text-2xl font-semibold">Review {metrics.pendingBookingRequests} pending request{metrics.pendingBookingRequests === 1 ? "" : "s"}</p>
          </div>
          <ChevronRight className="size-6 shrink-0" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
