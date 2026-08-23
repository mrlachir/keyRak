"use client";

import { Check, LoaderCircle, UsersRound, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { updateBookingStatusAction } from "@/app/actions/admin";
import { StatusBadge } from "@/components/booking/status-badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import type { AdminBooking, BookingStatus } from "@/types";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(`${value}T12:00:00`),
  );
}

export function BookingReviewTable({ initialBookings }: { initialBookings: AdminBooking[] }) {
  const router = useRouter();
  const [bookings, setBookings] = useState(initialBookings);
  const [processing, setProcessing] = useState<{ id: string; status: BookingStatus } | null>(null);

  const decide = async (booking: AdminBooking, status: "CONFIRMED" | "CANCELLED") => {
    if (processing) return;
    setProcessing({ id: booking.id, status });
    const result = await updateBookingStatusAction(booking.id, status);
    if (!result.ok) {
      toast.error("Decision not saved", { description: result.message });
      setProcessing(null);
      return;
    }

    setBookings((current) => current.filter((item) => item.id !== booking.id));
    toast.success(status === "CONFIRMED" ? "Booking approved" : "Booking rejected", {
      description:
        status === "CONFIRMED"
          ? "The stay is confirmed and its dates remain blocked."
          : "The request was cancelled and its dates are available again.",
    });
    setProcessing(null);
    router.refresh();
  };

  if (bookings.length === 0) {
    return (
      <div className="surface-card rounded-[2rem] px-6 py-16 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-olive-100 text-olive-700">
          <Check className="size-6" aria-hidden="true" />
        </span>
        <h2 className="mt-5 font-serif text-3xl font-semibold text-ink">The review queue is clear.</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-sand-700">
          New pending requests will appear here in the order they were submitted.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[2rem] border border-sand-200 bg-sand-50 shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left">
          <thead className="bg-sand-200/70 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-sand-800">
            <tr>
              <th className="px-6 py-4">Guest</th>
              <th className="px-6 py-4">Property</th>
              <th className="px-6 py-4">Stay</th>
              <th className="px-6 py-4">Guests</th>
              <th className="px-6 py-4">Value</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Decision</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-200">
            {bookings.map((booking) => {
              const approving = processing?.id === booking.id && processing.status === "CONFIRMED";
              const rejecting = processing?.id === booking.id && processing.status === "CANCELLED";
              return (
                <tr key={booking.id} className="align-top transition hover:bg-white/70">
                  <td className="px-6 py-5">
                    <p className="font-bold text-ink">{booking.guestName || "KEYRAK guest"}</p>
                    <p className="mt-1 text-xs text-sand-600">{booking.guestEmail}</p>
                  </td>
                  <td className="px-6 py-5">
                    <Link href={`/properties/${booking.propertyId}`} className="font-bold text-majorelle-700 hover:underline">
                      {booking.propertyTitle}
                    </Link>
                    {booking.specialRequests && (
                      <p className="mt-2 max-w-56 text-xs leading-5 text-sand-600">“{booking.specialRequests}”</p>
                    )}
                  </td>
                  <td className="px-6 py-5 text-sm font-semibold text-sand-800">
                    <p>{formatDate(booking.checkInDate)}</p>
                    <p className="mt-1 text-xs font-medium text-sand-600">to {formatDate(booking.checkOutDate)}</p>
                  </td>
                  <td className="px-6 py-5">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-sand-800">
                      <UsersRound className="size-4 text-terracotta-600" aria-hidden="true" />
                      {booking.adults + booking.children}
                    </span>
                  </td>
                  <td className="px-6 py-5 font-serif text-xl font-bold text-ink">
                    {formatPrice(Number(booking.totalPrice))}
                  </td>
                  <td className="px-6 py-5"><StatusBadge status={booking.status} /></td>
                  <td className="px-6 py-5">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        className="min-w-28 px-4 text-terracotta-700"
                        disabled={processing !== null}
                        onClick={() => decide(booking, "CANCELLED")}
                      >
                        {rejecting ? <LoaderCircle className="size-4 animate-spin" /> : <X className="size-4" />}
                        {rejecting ? "Rejecting…" : "Reject"}
                      </Button>
                      <Button
                        className="min-w-28 px-4"
                        disabled={processing !== null}
                        onClick={() => decide(booking, "CONFIRMED")}
                      >
                        {approving ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
                        {approving ? "Approving…" : "Approve"}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
