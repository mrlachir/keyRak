"use client";

import { CalendarDays, Headphones, LoaderCircle, MapPin, UsersRound, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { cancelPendingBookingAction } from "@/app/actions/booking";
import { StatusBadge } from "@/components/booking/status-badge";
import { formatPrice } from "@/lib/utils";
import type { Trip } from "@/types";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function BookingCard({ trip: initialTrip }: { trip: Trip }) {
  const router = useRouter();
  const [trip, setTrip] = useState(initialTrip);
  const [isPending, startTransition] = useTransition();

  function cancelReservation() {
    if (isPending) return;
    if (!window.confirm("Cancel this pending reservation request?")) return;

    startTransition(async () => {
      const result = await cancelPendingBookingAction(trip.id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setTrip((current) => ({ ...current, status: "CANCELLED" }));
      toast.success("Reservation cancelled.");
      router.refresh();
    });
  }

  const supportHref = `mailto:support@keyrak.ma?subject=${encodeURIComponent(`Cancellation support — ${trip.propertyTitle} — ${trip.id}`)}`;

  return (
    <article className="surface-card grid gap-6 rounded-[2rem] p-6 sm:p-7 md:grid-cols-[1fr_auto] md:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={trip.status} />
          <span className="text-xs font-semibold text-sand-600">Requested {formatDate(trip.createdAt.slice(0, 10))}</span>
        </div>
        <Link href={`/properties/${trip.propertyId}`} className="mt-4 inline-block font-serif text-3xl font-semibold text-ink transition hover:text-majorelle-700">
          {trip.propertyTitle}
        </Link>
        <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-sand-700">
          <MapPin className="size-4 text-terracotta-600" aria-hidden="true" /> {trip.propertyCity}
        </p>
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm text-sand-700">
          <span className="inline-flex items-center gap-2">
            <CalendarDays className="size-4 text-majorelle-600" aria-hidden="true" /> {formatDate(trip.checkInDate)} — {formatDate(trip.checkOutDate)}
          </span>
          <span className="inline-flex items-center gap-2">
            <UsersRound className="size-4 text-olive-600" aria-hidden="true" /> {trip.adults + trip.children} guest{trip.adults + trip.children === 1 ? "" : "s"}
          </span>
        </div>

        {trip.status === "PENDING" && (
          <button
            type="button"
            onClick={cancelReservation}
            disabled={isPending}
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-red-300 bg-red-50 px-5 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <XCircle className="size-4" aria-hidden="true" />}
            {isPending ? "Cancelling…" : "Cancel reservation"}
          </button>
        )}

        {trip.status === "CONFIRMED" && (
          <a
            href={supportHref}
            title="Confirmed reservations require support assistance to cancel."
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-sand-300 bg-sand-100 px-5 text-sm font-bold text-sand-600 transition hover:border-terracotta-300 hover:text-terracotta-700"
          >
            <Headphones className="size-4" aria-hidden="true" /> Contact support to cancel
          </a>
        )}
      </div>

      <div className="border-t border-sand-200 pt-5 text-left md:border-l md:border-t-0 md:pl-8 md:pt-0 md:text-right">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-sand-600">Stay total</p>
        <p className="mt-2 font-serif text-3xl font-bold text-ink">{formatPrice(Number(trip.totalPrice))}</p>
      </div>
    </article>
  );
}

export function ProfileBookingList({ trips }: { trips: Trip[] }) {
  return (
    <div className="mt-10 grid gap-5">
      {trips.map((trip) => <BookingCard key={trip.id} trip={trip} />)}
    </div>
  );
}
