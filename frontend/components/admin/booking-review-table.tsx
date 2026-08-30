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

type QueueFilter = "all" | "bookings" | "cancellations";
type Decision = "CONFIRMED" | "CANCELLED" | "APPROVE_CANCELLATION" | "REJECT_CANCELLATION";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value + "T12:00:00"));
}

export function BookingReviewTable({ initialBookings }: { initialBookings: AdminBooking[] }) {
  const router = useRouter();
  const [bookings, setBookings] = useState(initialBookings);
  const [filter, setFilter] = useState<QueueFilter>("all");
  const [processing, setProcessing] = useState<{ id: string; action: Decision } | null>(null);
  const cancellation = (booking: AdminBooking) => booking.status === "CONFIRMED" && booking.cancellationRequested;
  const filters: Array<{ id: QueueFilter; label: string; count: number }> = [
    { id: "all", label: "All", count: bookings.length },
    { id: "bookings", label: "Booking Requests", count: bookings.filter(booking => booking.status === "PENDING").length },
    { id: "cancellations", label: "Cancellation Requests", count: bookings.filter(cancellation).length },
  ];
  const visible = bookings.filter(booking => filter === "all" || (filter === "bookings" ? booking.status === "PENDING" : cancellation(booking)));

  async function decide(booking: AdminBooking, action: Decision) {
    if (processing) return;
    setProcessing({ id: booking.id, action });
    try {
      const result = action === "CONFIRMED" || action === "CANCELLED"
        ? await updateBookingStatusAction(booking.id, action)
        : await moderateCancellationRequestAction(booking.id, action === "APPROVE_CANCELLATION");
      if (!result.ok) { toast.error("Decision not saved", { description: result.message }); return; }
      setBookings(current => current.map(item => item.id === booking.id ? result.data : item));
      toast.success(action === "CONFIRMED" ? "Booking approved" : action === "CANCELLED" ? "Booking rejected" : action === "APPROVE_CANCELLATION" ? "Cancellation approved" : "Cancellation request rejected");
      router.refresh();
    } catch { toast.error("The decision could not be saved. Please try again."); }
    finally { setProcessing(null); }
  }

  function actions(booking: AdminBooking) {
    const isCancellation = cancellation(booking);
    if (booking.status !== "PENDING" && !isCancellation) return <span className="text-xs leading-5 text-sand-600">{booking.status === "CANCELLED" ? "Reservation closed" : "No pending decision"}</span>;
    const choices: Array<{ action: Decision; label: string; icon: typeof Check; primary?: boolean }> = isCancellation
      ? [{ action: "APPROVE_CANCELLATION", label: "Approve cancellation", icon: Check, primary: true }, { action: "REJECT_CANCELLATION", label: "Reject request", icon: RotateCcw }]
      : [{ action: "CONFIRMED", label: "Approve", icon: Check, primary: true }, { action: "CANCELLED", label: "Reject", icon: X }];
    return <div className="flex flex-wrap gap-2 xl:flex-col">{choices.map(({ action, label, icon: Icon, primary }) => <Button key={action} variant={primary ? "primary" : "secondary"} disabled={processing !== null}
      onClick={() => decide(booking, action)} className={cn("min-h-10 px-3 py-2 text-xs xl:w-full", primary && isCancellation && "bg-terracotta-600 hover:bg-terracotta-700")}>
      {processing?.id === booking.id && processing.action === action ? <LoaderCircle className="size-3.5 shrink-0 animate-spin" /> : <Icon className="size-3.5 shrink-0" />}{label}
    </Button>)}</div>;
  }

  function guest(booking: AdminBooking) {
    return <div className="min-w-0"><p className="break-words text-sm font-bold text-ink">{booking.guestName || "KEYRAK guest"}</p><p className="mt-1 break-all text-xs leading-5 text-sand-600">{booking.guestEmail}</p><p className="mt-2 flex items-start gap-1.5 break-words text-xs text-sand-700"><Phone className="size-3.5 shrink-0 text-terracotta-600" />{booking.guestTelephone || "Telephone not provided"}</p></div>;
  }

  function property(booking: AdminBooking) {
    return <div><Link href={`/admin/properties/${booking.propertyId}/edit`} className="break-words text-sm font-bold leading-6 text-majorelle-700 hover:underline">{booking.propertyTitle}</Link><p className="mt-1 text-[0.65rem] font-semibold text-sand-600">REF {booking.id.slice(0, 8).toUpperCase()}</p>{booking.specialRequests && <p className="mt-2 break-words text-xs italic leading-5 text-sand-700">“{booking.specialRequests}”</p>}</div>;
  }

  function dates(booking: AdminBooking) {
    return <div className="text-xs leading-5 text-sand-800"><p><span className="text-sand-600">In </span>{formatDate(booking.checkInDate)}</p><p><span className="text-sand-600">Out </span>{formatDate(booking.checkOutDate)}</p><p className="mt-2 flex items-center gap-1.5"><UsersRound className="size-3.5 text-terracotta-600" />{booking.adults + booking.children} guests</p><p className="text-[0.65rem] text-sand-600">{booking.adults} adults · {booking.children} children</p></div>;
  }

  function payment(booking: AdminBooking) {
    return <div><PaymentMethodBadge paymentMethod={booking.paymentMethod} /><p className={cn("mt-2 text-xs font-semibold", booking.paymentCompleted ? "text-olive-700" : "text-sand-600")}>{booking.paymentCompleted ? "Payment completed" : "No completed payment recorded"}</p></div>;
  }

  function status(booking: AdminBooking) {
    return <div className="flex flex-wrap gap-2"><StatusBadge status={booking.status} />{cancellation(booking) && <span className="inline-flex items-start gap-1 rounded-xl border border-amber-300 bg-amber-100 px-2.5 py-1.5 text-[0.65rem] font-bold text-amber-800"><Clock3 className="mt-0.5 size-3 shrink-0" />Cancellation requested</span>}</div>;
  }

  return <section className="overflow-hidden rounded-[2rem] border border-sand-200 bg-sand-50 shadow-card" aria-label="Reservation management">
    <header className="flex flex-col justify-between gap-3 border-b border-sand-200 bg-sand-100/80 p-5 sm:flex-row sm:items-center sm:px-6"><div><p className="eyebrow">Reservation register</p><p className="mt-1 text-sm text-sand-700">Guest, stay, payment, and decision details in one place.</p></div><p className="w-fit rounded-full border border-sand-300 bg-white px-3 py-1.5 text-xs font-bold" aria-live="polite">{visible.length} reservations</p></header>
    <div className="flex flex-wrap gap-2 border-b border-sand-200 bg-white/70 px-5 py-4 sm:px-6" aria-label="Filter reservation requests">{filters.map(option => <button key={option.id} type="button" aria-pressed={filter === option.id} aria-controls="reservation-register-results" onClick={() => setFilter(option.id)}
      className={cn("inline-flex min-h-10 items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition focus-visible:ring-2 focus-visible:ring-majorelle-400", filter === option.id ? "border-majorelle-600 bg-majorelle-600 text-white" : "border-sand-200 bg-sand-50 text-sand-800 hover:border-majorelle-300")}>
      {option.label}<span className={cn("rounded-full px-2 py-0.5 text-[0.65rem]", filter === option.id ? "bg-white/20" : "bg-sand-200")}>{option.count}</span></button>)}</div>
    <div id="reservation-register-results">
      <table className="hidden w-full table-fixed text-left xl:table"><caption className="sr-only">Reservation dates, guest contacts, payment methods, statuses, total prices, and moderation actions</caption>
        <thead className="bg-sand-100 text-[0.65rem] uppercase tracking-widest text-sand-700"><tr><th className="w-[16%] p-4">Guest / contact</th><th className="w-[18%] p-4">Property</th><th className="w-[14%] p-4">Dates / guests</th><th className="w-[15%] p-4">Payment method</th><th className="w-[11%] p-4">Total price</th><th className="w-[12%] p-4">Status</th><th className="p-4">Decision</th></tr></thead>
        <tbody className="divide-y divide-sand-200">{visible.map(booking => <tr key={booking.id} className={cn("align-top", cancellation(booking) ? "bg-amber-50/70" : "hover:bg-white")}>
          <td className="p-4">{guest(booking)}</td><td className="p-4">{property(booking)}</td><td className="p-4">{dates(booking)}</td><td className="p-4">{payment(booking)}</td><td className="p-4 font-serif text-xl font-bold text-ink">{formatPrice(Number(booking.totalPrice))}</td><td className="p-4">{status(booking)}</td><td className="p-4">{actions(booking)}</td>
        </tr>)}</tbody>
      </table>
      <div className="divide-y divide-sand-200 xl:hidden">{visible.map(booking => <article key={booking.id} className={cn("p-5 sm:p-6", cancellation(booking) && "bg-amber-50/70")}>
        <div className="flex flex-wrap items-start justify-between gap-3">{status(booking)}<p className="font-serif text-2xl font-bold text-ink">{formatPrice(Number(booking.totalPrice))}</p></div>
        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2"><div><p className="eyebrow mb-2">Guest</p>{guest(booking)}</div><div><p className="eyebrow mb-2">Property</p>{property(booking)}</div><div><p className="eyebrow mb-2">Dates & guests</p>{dates(booking)}</div><div><p className="eyebrow mb-2">Payment</p>{payment(booking)}</div></div>
        <div className="mt-5 border-t border-sand-200 pt-4">{actions(booking)}</div>
      </article>)}</div>
      {visible.length === 0 && <div role="status" className="p-10 text-center"><Check className="mx-auto size-7 text-olive-700" /><h2 className="mt-3 font-serif text-2xl font-semibold text-ink">{filter === "all" ? "No reservations yet." : "No requests awaiting review."}</h2><p className="mt-2 text-sm text-sand-700">New reservations and requests will appear here.</p></div>}
    </div>
  </section>;
}
