"use client";

import { SecureIdCard } from "@/components/admin/secure-id-card";

import Link from "next/link";
import { ChevronLeft, ChevronRight, ExternalLink, ImageIcon, MapPin, Star, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { PaymentMethodBadge } from "@/components/booking/payment-method-badge";
import { StatusBadge } from "@/components/booking/status-badge";
import { PropertyImage } from "@/components/property/property-image";
import { cn, formatPrice } from "@/lib/utils";
import type { AdminBooking, AdminReview, Property } from "@/types";

export function shortDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value.slice(0, 10)}T12:00:00`));
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="min-w-0 rounded-2xl bg-sand-100/70 p-4"><dt className="text-[0.65rem] font-bold uppercase tracking-widest text-sand-700">{label}</dt><dd className="mt-2 break-words text-sm font-semibold leading-6 text-ink">{children}</dd></div>;
}

function PropertyPhotos({ property }: { property: Property }) {
  const images = property.media.filter(item => item.type === "IMAGE");
  const [index, setIndex] = useState(0);
  return <div>
    <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-sand-200">
      {images.length ? <PropertyImage fill src={images[index]?.url} alt={`${property.title} — photo ${index + 1}`} className="object-cover" />
        : <div className="absolute inset-0 grid place-content-center gap-2 text-center text-sm text-sand-700"><ImageIcon className="mx-auto size-8" aria-hidden="true" />No property photos</div>}
      {images.length > 1 && <>
        <button type="button" aria-label="Previous property photo" onClick={() => setIndex(current => (current - 1 + images.length) % images.length)} className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-ink shadow focus-visible:ring-2 focus-visible:ring-majorelle-500"><ChevronLeft className="size-5" /></button>
        <button type="button" aria-label="Next property photo" onClick={() => setIndex(current => (current + 1) % images.length)} className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-ink shadow focus-visible:ring-2 focus-visible:ring-majorelle-500"><ChevronRight className="size-5" /></button>
      </>}
    </div>
    {images.length > 1 && <p className="mt-2 text-right text-xs font-semibold text-sand-700" aria-live="polite">Photo {index + 1} of {images.length}</p>}
    <h3 className="mt-4 font-serif text-3xl font-semibold leading-tight">{property.title}</h3>
    <p className="mt-2 flex items-start gap-2 text-sm leading-6 text-sand-800"><MapPin className="mt-1 size-4 shrink-0 text-terracotta-600" aria-hidden="true" />{property.address}, {property.city}</p>
    <p className="mt-3 text-xs font-semibold leading-6 text-sand-700"><span className="capitalize">{property.propertyType.toLowerCase()}</span> · {property.bedrooms} {property.bedrooms === 1 ? "bedroom" : "bedrooms"} · {property.bathrooms} {property.bathrooms === 1 ? "bathroom" : "bathrooms"} · Up to {property.maxGuests} guests</p>
    <div className="mt-5 flex flex-wrap gap-3">
      {property.active && <Link href={`/properties/${property.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-majorelle-600 px-4 text-xs font-bold text-white hover:bg-majorelle-700">View property & media <ExternalLink className="size-3.5" aria-hidden="true" /></Link>}
      <Link href={`/admin/properties/${property.id}/edit`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-sand-300 px-4 text-xs font-bold text-sand-800 hover:bg-sand-100">{property.active ? "Edit property" : "View unpublished property"}<ExternalLink className="size-3.5" aria-hidden="true" /></Link>
    </div>
  </div>;
}

export function ReservationDetailDialog({ booking, review, actions, busy, onClose }: {
  booking?: AdminBooking;
  review?: AdminReview;
  actions?: React.ReactNode;
  busy: boolean;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const property = booking?.property ?? review?.property;
  const isCancellation = booking?.status === "CONFIRMED" && booking.cancellationRequested;

  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      previous?.focus({ preventScroll: true });
    };
  }, []);

  if (!property) return null;
  return <dialog ref={dialog} aria-labelledby={headingId} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
    onClick={event => { if (event.target === event.currentTarget && !busy) onClose(); }}
    className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-5xl overflow-y-auto rounded-[2rem] border border-sand-200 bg-sand-50 p-0 text-ink shadow-float backdrop:bg-ink/55 backdrop:backdrop-blur-sm">
    <div>
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-sand-200 bg-sand-50 px-5 py-4 sm:px-7">
        <div><p className="eyebrow">Booking control</p><h2 id={headingId} className="mt-1 font-serif text-2xl font-semibold sm:text-3xl">{review ? "Guest review" : isCancellation ? "Cancellation request" : "Reservation details"}</h2></div>
        <button type="button" onClick={onClose} disabled={busy} aria-label="Close details" className="grid size-10 shrink-0 place-items-center rounded-full border border-sand-200 text-sand-800 hover:bg-sand-100 focus-visible:ring-2 focus-visible:ring-majorelle-500 disabled:opacity-50"><X className="size-5" /></button>
      </header>
      <div className="grid gap-7 p-5 sm:p-7 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <PropertyPhotos key={property.id} property={property} />
        <div className="min-w-0">
          {review && <>
            <div className="flex flex-wrap items-center gap-3"><span className="flex items-center gap-1 text-terracotta-500" aria-label={`${review.rating} out of 5 stars`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} className={cn("size-5", index < review.rating && "fill-current")} aria-hidden="true" />)}</span><span className="rounded-full bg-olive-50 px-3 py-1 text-xs font-bold text-olive-800">Verified stay</span></div>
            <h3 className="mt-5 text-base font-bold">{review.authorName || "KEYRAK guest"}</h3>
            <p className="mt-1 text-xs text-sand-700">Submitted {shortDate(review.createdAt)}</p>
            <blockquote className="mt-5 whitespace-pre-wrap break-words rounded-2xl border border-sand-200 bg-white p-5 text-sm leading-7">{review.comment}</blockquote>
            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              <Field label="Email">{review.authorEmail}</Field><Field label="Telephone">{review.authorTelephone || "Not provided"}</Field>
              <Field label="Review reference"><span className="font-mono text-xs">{review.id}</span></Field><Field label="Last updated">{shortDate(review.updatedAt)}</Field>
            </dl>
          </>}
          {booking && <>
            <div className="flex flex-wrap items-center gap-2"><StatusBadge status={booking.status} />{isCancellation && <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">Cancellation requested</span>}</div>
            <h3 className="mt-5 text-lg font-bold">{booking.guestName || "KEYRAK guest"}</h3>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Email">{booking.guestEmail}</Field><Field label="Telephone">{booking.guestTelephone || "Not provided"}</Field>
              <Field label="Check-in">{shortDate(booking.checkInDate)}</Field><Field label="Check-out">{shortDate(booking.checkOutDate)}</Field>
              <Field label="Guests">{booking.adults} {booking.adults === 1 ? "adult" : "adults"} · {booking.children} {booking.children === 1 ? "child" : "children"}</Field><Field label="Stay total">{formatPrice(Number(booking.totalPrice))}</Field>
              <Field label="Payment method"><PaymentMethodBadge paymentMethod={booking.paymentMethod} /><span className="mt-2 block text-xs text-sand-700">{booking.paymentCompleted ? "Payment completed" : "No completed payment recorded"}</span></Field>
              <Field label="Government ID">{booking.guestHasIdCard ? "On file in guest profile" : "Not on file"}</Field>
              <Field label="Requested">{shortDate(booking.createdAt)}</Field><Field label="Last updated">{shortDate(booking.updatedAt)}</Field>
            </dl>
            {booking.guestHasIdCard && <div className="mt-4"><SecureIdCard userId={booking.userId} /></div>}
            <section className="mt-4 rounded-2xl border border-sand-200 p-4"><h4 className="text-xs font-bold uppercase tracking-widest text-sand-700">Special requests</h4><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7">{booking.specialRequests || "No special requests."}</p></section>
            <p className="mt-4 break-all font-mono text-xs text-sand-700">Booking reference: {booking.id}</p>
            <div className="mt-5 border-t border-sand-200 pt-5">{actions}</div>
          </>}
        </div>
      </div>
    </div>
  </dialog>;
}
