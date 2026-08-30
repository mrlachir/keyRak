import type { Metadata } from "next";

import { BookingReviewTable } from "@/components/admin/booking-review-table";
import { getAdminBookings } from "@/lib/management";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Booking management",
  description: "Review new KEYRAK bookings and confirmed-stay cancellation requests.",
};

export default async function AdminBookingsPage() {
  const bookings = await getAdminBookings();

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="mx-auto w-full max-w-[1600px]">
        <p className="eyebrow">Booking control</p>
        <h1 className="mt-3 font-serif text-5xl font-semibold leading-none text-ink sm:text-6xl">Every reservation, in view.</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-sand-700">
          View the full reservation history, guest contacts, payments, and stay details. Filter requests when it is time to review a decision.
        </p>
        <div className="mt-9"><BookingReviewTable initialBookings={bookings} /></div>
      </div>
    </div>
  );
}
