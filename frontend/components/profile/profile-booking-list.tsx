"use client";

import { ArrowUpRight, CalendarDays, Clock3, Hash, LoaderCircle, MapPin, MoonStar, TriangleAlert, UsersRound, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { cancelPendingBookingAction, requestBookingCancellationAction } from "@/app/actions/booking";
import { PaymentMethodBadge } from "@/components/booking/payment-method-badge";
import { StatusBadge } from "@/components/booking/status-badge";
import { PropertyImage } from "@/components/property/property-image";
import { formatPrice } from "@/lib/utils";
import type { Trip } from "@/types";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function nightsBetween(checkInDate: string, checkOutDate: string): number {
  const start = Date.parse(`${checkInDate}T12:00:00Z`);
  const end = Date.parse(`${checkOutDate}T12:00:00Z`);
  return Math.max(0, Math.round((end - start) / 86_400_000));
}

function BookingCard({ trip: initialTrip }: { trip: Trip }) {
  const router = useRouter();
  const [trip, setTrip] = useState(initialTrip);
  const [isPending, startTransition] = useTransition();
  const nights = nightsBetween(trip.checkInDate, trip.checkOutDate);
  const totalGuests = trip.adults + trip.children;
  const bookingReference = trip.id.slice(0, 8).toUpperCase();

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

  function requestCancellation() {
    if (isPending || trip.cancellationRequested) return;
    if (!window.confirm("Send this cancellation request to the KEYRAK admin team?")) return;

    startTransition(async () => {
      const result = await requestBookingCancellationAction(trip.id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setTrip((current) => ({ ...current, cancellationRequested: true }));
      toast.success("Cancellation request sent", {
        description: "Your confirmed dates remain reserved until an administrator approves it.",
      });
      router.refresh();
    });
  }

  return (
    <article id={`booking-${trip.id}`} className="surface-card scroll-mt-28 overflow-hidden rounded-[2rem] target:ring-2 target:ring-majorelle-400">
      <div className="grid lg:grid-cols-[15rem_minmax(0,1fr)]">
        <Link href={`/properties/${trip.propertyId}`} className="group relative min-h-56 overflow-hidden bg-sand-200 lg:min-h-full" aria-label={`View ${trip.propertyTitle}`}>
          <PropertyImage
            src={trip.propertyImageUrl}
            alt={trip.propertyTitle}
            fill
            className="object-cover transition duration-500 group-hover:scale-105"
          />
          <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-ink/80 to-transparent px-5 pb-4 pt-12 text-sm font-bold text-white">
            View property <ArrowUpRight className="size-4" aria-hidden="true" />
          </span>
        </Link>

        <div className="min-w-0 p-5 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-wrap items-center gap-2.5">
              <StatusBadge status={trip.status} />
              {trip.status === "CONFIRMED" && trip.cancellationRequested && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-800">
                  <Clock3 className="size-3.5" aria-hidden="true" /> Cancellation pending approval
                </span>
              )}
              <span className="text-xs font-semibold text-sand-600">Requested {formatDate(trip.createdAt.slice(0, 10))}</span>
            </div>
            <div className="shrink-0 sm:text-right">
              <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-sand-600">Stay total</p>
              <p className="mt-1 font-serif text-3xl font-bold text-ink">{formatPrice(Number(trip.totalPrice))}</p>
            </div>
          </div>

          <Link href={`/properties/${trip.propertyId}`} className="mt-5 inline-block font-serif text-3xl font-semibold leading-tight text-ink transition hover:text-majorelle-700">
            {trip.propertyTitle}
          </Link>
          <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-sand-700">
            <MapPin className="size-4 text-terracotta-600" aria-hidden="true" /> {trip.propertyCity}
          </p>

          <dl className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-sand-200 bg-sand-100/60 p-4">
              <dt className="flex items-center gap-2 text-[0.65rem] font-extrabold uppercase tracking-[0.12em] text-sand-600">
                <CalendarDays className="size-4 text-majorelle-600" aria-hidden="true" /> Stay dates
              </dt>
              <dd className="mt-2 text-sm font-bold leading-6 text-ink">{formatDate(trip.checkInDate)} → {formatDate(trip.checkOutDate)}</dd>
              <dd className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-sand-600">
                <MoonStar className="size-3.5" aria-hidden="true" /> {nights} night{nights === 1 ? "" : "s"}
              </dd>
            </div>

            <div className="rounded-2xl border border-sand-200 bg-sand-100/60 p-4">
              <dt className="flex items-center gap-2 text-[0.65rem] font-extrabold uppercase tracking-[0.12em] text-sand-600">
                <UsersRound className="size-4 text-olive-600" aria-hidden="true" /> Guests
              </dt>
              <dd className="mt-2 text-sm font-bold text-ink">{totalGuests} guest{totalGuests === 1 ? "" : "s"}</dd>
              <dd className="mt-1 text-xs font-semibold text-sand-600">{trip.adults} adult{trip.adults === 1 ? "" : "s"} · {trip.children} child{trip.children === 1 ? "" : "ren"}</dd>
            </div>

            <div className="rounded-2xl border border-sand-200 bg-sand-100/60 p-4">
              <dt className="text-[0.65rem] font-extrabold uppercase tracking-[0.12em] text-sand-600">Payment method</dt>
              <dd className="mt-2"><PaymentMethodBadge paymentMethod={trip.paymentMethod} /></dd>
              <dd className="mt-2 text-xs font-medium leading-5 text-sand-600">
                {trip.paymentMethod === "CREDIT_CARD" ? "Test mode · No real charge." : trip.paymentMethod === "CASH_ON_ARRIVAL" ? "Payment is due directly at check-in." : "Payment method not recorded."}
              </dd>
            </div>

            <div className="rounded-2xl border border-sand-200 bg-sand-100/60 p-4">
              <dt className="flex items-center gap-2 text-[0.65rem] font-extrabold uppercase tracking-[0.12em] text-sand-600">
                <Hash className="size-4 text-terracotta-600" aria-hidden="true" /> Booking reference
              </dt>
              <dd className="mt-2 font-mono text-sm font-bold tracking-[0.08em] text-ink">{bookingReference}</dd>
              <dd className="mt-1 text-xs font-medium text-sand-600">Keep this reference when contacting support.</dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-col gap-3 border-t border-sand-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {trip.status === "PENDING" && (
                <button
                  type="button"
                  onClick={cancelReservation}
                  disabled={isPending}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-red-300 bg-red-50 px-5 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <XCircle className="size-4" aria-hidden="true" />}
                  {isPending ? "Cancelling…" : "Cancel reservation"}
                </button>
              )}

              {trip.status === "CONFIRMED" && !trip.cancellationRequested && (
                <button
                  type="button"
                  onClick={requestCancellation}
                  disabled={isPending}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-amber-300 bg-amber-100 px-5 text-sm font-bold text-amber-800 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <TriangleAlert className="size-4" aria-hidden="true" />}
                  {isPending ? "Sending request…" : "Request cancellation"}
                </button>
              )}

              {trip.status === "CONFIRMED" && trip.cancellationRequested && (
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-amber-800">
                  <Clock3 className="size-4" aria-hidden="true" /> Your cancellation request is being reviewed.
                </p>
              )}

              {trip.status === "CANCELLED" && (
                <p className="text-sm font-semibold text-sand-600">This reservation is closed.</p>
              )}
            </div>

            <Link href={`/properties/${trip.propertyId}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-sand-300 bg-white px-5 text-sm font-bold text-ink transition hover:border-majorelle-300 hover:text-majorelle-700">
              Property details <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export function ProfileBookingList({ trips }: { trips: Trip[] }) {
  return (
    <div className="mt-10 grid gap-5">
      {trips.map((trip) => <BookingCard key={`${trip.id}:${trip.status}:${trip.cancellationRequested}`} trip={trip} />)}
    </div>
  );
}
