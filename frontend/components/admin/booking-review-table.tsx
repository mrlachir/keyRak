"use client";

import { Check, Clock3, LoaderCircle, Phone, RotateCcw, UsersRound, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { moderateCancellationRequestAction, updateBookingStatusAction } from "@/app/actions/admin";
import { PaymentMethodBadge } from "@/components/booking/payment-method-badge";
import { StatusBadge } from "@/components/booking/status-badge";
import { Button } from "@/components/ui/button";
import { cn, formatPrice } from "@/lib/utils";
import type { AdminBooking } from "@/types";

type ProcessingAction = "CONFIRMED" | "CANCELLED" | "APPROVE_CANCELLATION" | "REJECT_CANCELLATION";
type QueueFilter = "all" | "bookings" | "cancellations";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(`${value}T12:00:00`),
  );
}

export function BookingReviewTable({ initialBookings }: { initialBookings: AdminBooking[] }) {
  const router = useRouter();
  const [bookings, setBookings] = useState(initialBookings);
  const [filter, setFilter] = useState<QueueFilter>("all");
  const [processing, setProcessing] = useState<{ id: string; action: ProcessingAction } | null>(null);
  const pendingCount = bookings.filter(booking => booking.status === "PENDING").length;
  const cancellationCount = bookings.filter(booking => booking.status === "CONFIRMED" && booking.cancellationRequested).length;
  const visibleBookings = bookings.filter(booking => filter === "all" || (filter === "bookings"
    ? booking.status === "PENDING" : booking.status === "CONFIRMED" && booking.cancellationRequested));
  const filters: Array<{ id: QueueFilter; label: string; count: number }> = [
    { id: "all", label: "All", count: bookings.length },
    { id: "bookings", label: "Booking Requests", count: pendingCount },
    { id: "cancellations", label: "Cancellation Requests", count: cancellationCount },
  ];

  const decide = async (booking: AdminBooking, status: "CONFIRMED" | "CANCELLED") => {
    if (processing) return;
    setProcessing({ id: booking.id, action: status });
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

  const moderateCancellation = async (booking: AdminBooking, approved: boolean) => {
    if (processing) return;
    const action: ProcessingAction = approved ? "APPROVE_CANCELLATION" : "REJECT_CANCELLATION";
    setProcessing({ id: booking.id, action });
    const result = await moderateCancellationRequestAction(booking.id, approved);
    if (!result.ok) {
      toast.error("Decision not saved", { description: result.message });
      setProcessing(null);
      return;
    }

    setBookings((current) => current.filter((item) => item.id !== booking.id));
    toast.success(approved ? "Cancellation approved" : "Cancellation request rejected", {
      description: approved
        ? "The reservation is cancelled and its dates are available again."
        : "The reservation remains confirmed and its dates stay blocked.",
    });
    setProcessing(null);
    router.refresh();
  };

  return (
    <section className="overflow-hidden rounded-[2rem] border border-sand-200 bg-sand-50 shadow-card" aria-label="Reservation review queue">
      <header className="flex flex-col gap-3 border-b border-sand-200 bg-sand-100/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-terracotta-700">Awaiting review</p>
          <p className="mt-1 text-sm text-sand-700">Review each request with its guest, stay, and payment details together.</p>
        </div>
        <span className="w-fit rounded-full border border-sand-300 bg-white px-3 py-1.5 text-xs font-bold text-ink">
          {visibleBookings.length} {visibleBookings.length === 1 ? "request" : "requests"}
        </span>
      </header>
      <div className="flex flex-wrap gap-2 border-b border-sand-200 bg-white/70 px-5 py-4 sm:px-6" aria-label="Filter reservation requests">
        {filters.map(option => (
          <button key={option.id} type="button" aria-pressed={filter === option.id} aria-controls="reservation-queue-results"
            onClick={() => setFilter(option.id)}
            className={cn("inline-flex min-h-10 items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-majorelle-400", filter === option.id ? "border-majorelle-600 bg-majorelle-600 text-white shadow-sm" : "border-sand-200 bg-sand-50 text-sand-800 hover:border-majorelle-300 hover:text-majorelle-700")}>
            {option.label}<span className={cn("rounded-full px-2 py-0.5 text-[0.65rem]", filter === option.id ? "bg-white/20" : "bg-sand-200 text-sand-700")}>{option.count}</span>
          </button>
        ))}
      </div>
      <div id="reservation-queue-results" className="divide-y divide-sand-200">
        {visibleBookings.length === 0 && (
          <div className="px-6 py-12 text-center" role="status">
            <Check className="mx-auto size-7 text-olive-600" aria-hidden="true" />
            <h2 className="mt-4 font-serif text-2xl font-semibold text-ink">{filter === "all" ? "The review queue is clear." : `No ${filter === "bookings" ? "booking" : "cancellation"} requests.`}</h2>
            <p className="mt-2 text-sm text-sand-700">New requests will appear here when they are submitted.</p>
          </div>
        )}
        {visibleBookings.map((booking) => {
          const cancellationReview = booking.status === "CONFIRMED" && booking.cancellationRequested;
          const approving = processing?.id === booking.id && processing.action === "CONFIRMED";
          const rejecting = processing?.id === booking.id && processing.action === "CANCELLED";
          const approvingCancellation = processing?.id === booking.id && processing.action === "APPROVE_CANCELLATION";
          const rejectingCancellation = processing?.id === booking.id && processing.action === "REJECT_CANCELLATION";

          return (
            <article
              key={booking.id}
              className={`grid gap-5 px-5 py-6 transition sm:px-6 lg:grid-cols-2 xl:grid-cols-[1.05fr_1.3fr_1.05fr_1.45fr] xl:items-center ${
                cancellationReview ? "bg-amber-50/75 hover:bg-amber-50" : "bg-sand-50 hover:bg-white"
              }`}
            >
              <div className="min-w-0">
                <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.14em] text-sand-600">Guest</p>
                <p className="mt-2 text-base font-bold text-ink">{booking.guestName || "KEYRAK guest"}</p>
                <p className="mt-1 break-all text-xs text-sand-600">{booking.guestEmail}</p>
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-sand-700">
                  <Phone className="size-3.5 shrink-0 text-terracotta-600" aria-hidden="true" />
                  {booking.guestTelephone || "Telephone not provided"}
                </p>
              </div>

              <div className="min-w-0">
                <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.14em] text-sand-600">Reservation</p>
                <Link href={`/properties/${booking.propertyId}`} className="mt-2 line-clamp-2 block font-bold leading-5 text-majorelle-700 hover:underline">
                  {booking.propertyTitle}
                </Link>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-sand-700">
                  <span>{formatDate(booking.checkInDate)} → {formatDate(booking.checkOutDate)}</span>
                  <span className="inline-flex items-center gap-1.5">
                    <UsersRound className="size-3.5 text-terracotta-600" aria-hidden="true" />
                    {booking.adults + booking.children} guests
                  </span>
                </div>
                {booking.specialRequests && (
                  <p className="mt-2 line-clamp-2 text-xs italic leading-5 text-sand-600">“{booking.specialRequests}”</p>
                )}
              </div>

              <div className="min-w-0">
                <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.14em] text-sand-600">Payment & status</p>
                <p className="mt-2 whitespace-nowrap font-serif text-xl font-bold text-ink">{formatPrice(Number(booking.totalPrice))}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <PaymentMethodBadge paymentMethod={booking.paymentMethod} />
                  <StatusBadge status={booking.status} />
                </div>
                {cancellationReview && (
                  <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-[0.68rem] font-extrabold text-amber-800">
                    <Clock3 className="size-3" aria-hidden="true" /> Cancellation requested
                  </span>
                )}
              </div>

              <div className="min-w-0 xl:border-l xl:border-sand-200 xl:pl-5">
                <p className="mb-3 text-[0.65rem] font-extrabold uppercase tracking-[0.14em] text-sand-600 xl:text-right">Decision</p>
                {cancellationReview ? (
                  <div className="grid gap-2 sm:grid-cols-2 xl:flex xl:justify-end">
                    <Button
                      variant="secondary"
                      className="w-full px-4 text-sand-700 xl:w-auto"
                      disabled={processing !== null}
                      onClick={() => moderateCancellation(booking, false)}
                    >
                      {rejectingCancellation ? <LoaderCircle className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                      {rejectingCancellation ? "Rejecting…" : "Reject request"}
                    </Button>
                    <Button
                      className="w-full bg-terracotta-600 px-4 hover:bg-terracotta-700 xl:w-auto"
                      disabled={processing !== null}
                      onClick={() => moderateCancellation(booking, true)}
                    >
                      {approvingCancellation ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
                      {approvingCancellation ? "Approving…" : "Approve cancellation"}
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 xl:flex xl:justify-end">
                    <Button
                      variant="secondary"
                      className="w-full px-4 text-terracotta-700 xl:w-auto xl:min-w-28"
                      disabled={processing !== null}
                      onClick={() => decide(booking, "CANCELLED")}
                    >
                      {rejecting ? <LoaderCircle className="size-4 animate-spin" /> : <X className="size-4" />}
                      {rejecting ? "Rejecting…" : "Reject"}
                    </Button>
                    <Button
                      className="w-full px-4 xl:w-auto xl:min-w-28"
                      disabled={processing !== null}
                      onClick={() => decide(booking, "CONFIRMED")}
                    >
                      {approving ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
                      {approving ? "Approving…" : "Approve"}
                    </Button>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
