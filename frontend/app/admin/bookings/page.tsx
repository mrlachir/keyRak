import type { Metadata } from "next";

import { BookingReviewTable } from "@/components/admin/booking-review-table";
import { getAdminBookings, getAdminReviews } from "@/lib/management";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Booking management",
  description: "Manage reservations, cancellation requests, and guest reviews.",
};

export default async function AdminBookingsPage({ searchParams }: PageProps<"/admin/bookings">) {
  const [bookings, reviews, query] = await Promise.all([getAdminBookings(), getAdminReviews(), searchParams]);
  const tab = typeof query.tab === "string" ? query.tab : "all";
  const reviewId = typeof query.review === "string" ? query.review : undefined;

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="mx-auto w-full max-w-[1600px]">
        <p className="eyebrow">Booking control</p>
        <h1 className="mt-3 font-serif text-5xl font-semibold leading-none text-ink sm:text-6xl">Stays, requests & guest reviews.</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-sand-700">
          Review reservations and cancellations, read guest feedback, and open any entry for the full details.
        </p>
        <div className="mt-9"><BookingReviewTable key={`${tab}:${reviewId ?? ""}`} initialBookings={bookings} reviews={reviews} initialTab={tab} initialReviewId={reviewId} /></div>
      </div>
    </div>
  );
}
