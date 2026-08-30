"use client";

import { Info, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import { AvailabilityCalendar } from "@/components/booking/availability-calendar";
import { BookingModal } from "@/components/booking/booking-modal";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";

export function BookingSidebar({
  propertyId,
  propertyTitle,
  pricePerNight,
  maxGuests,
  blockedDates,
  availabilityReady,
  hasSavedIdCard = false,
}: {
  propertyId: string;
  propertyTitle: string;
  pricePerNight: number;
  maxGuests: number;
  blockedDates: string[];
  availabilityReady: boolean;
  hasSavedIdCard?: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <aside className="surface-card rounded-3xl p-5 sm:p-6" aria-label="Availability and booking">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-sand-700">From</p>
            <p className="font-serif text-3xl font-bold text-ink">{formatPrice(pricePerNight)}</p>
          </div>
          <span className="pb-1 text-sm font-medium text-sand-700">per night</span>
        </div>

        <div className="mt-6 rounded-2xl border border-sand-200 bg-white p-3">
          {availabilityReady ? (
            <AvailabilityCalendar blockedDates={blockedDates} />
          ) : (
            <div className="rounded-xl bg-terracotta-50 p-4 text-sm leading-6 text-terracotta-900" role="status">
              <TriangleAlert className="mb-2 size-5 text-terracotta-600" aria-hidden="true" />
              Live availability is temporarily unavailable. Booking is paused to protect against date conflicts.
            </div>
          )}
        </div>

        <Button
          type="button"
          className="mt-5 w-full"
          disabled={!availabilityReady}
          onClick={() => setModalOpen(true)}
        >
          Book Now
        </Button>
        <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-sand-700">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          You won’t be charged yet. Booking confirmation is reviewed by the host.
        </p>
      </aside>

      {modalOpen && createPortal(
        <BookingModal
          propertyId={propertyId}
          propertyTitle={propertyTitle}
          pricePerNight={pricePerNight}
          maxGuests={maxGuests}
          blockedDates={blockedDates}
          hasSavedIdCard={hasSavedIdCard}
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false);
            toast.success("Booking request sent", {
              description: "Your stay is pending host confirmation.",
            });
          }}
        />,
        document.body,
      )}
    </>
  );
}
