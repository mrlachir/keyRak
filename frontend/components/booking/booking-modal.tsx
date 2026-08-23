"use client";

import { DayPicker, type DateRange } from "@daypicker/react";
import { LoaderCircle, Minus, Plus, UsersRound, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { createBookingAction } from "@/app/actions/booking";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";

function parseDate(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

function dateKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function nightsBetween(range: DateRange | undefined): number {
  if (!range?.from || !range.to) return 0;
  const start = Date.UTC(range.from.getFullYear(), range.from.getMonth(), range.from.getDate());
  const end = Date.UTC(range.to.getFullYear(), range.to.getMonth(), range.to.getDate());
  return Math.max(0, Math.round((end - start) / 86_400_000));
}

function includesBlockedDate(range: DateRange | undefined, blocked: Set<string>): boolean {
  if (!range?.from || !range.to) return false;
  for (let date = new Date(range.from); date < range.to; date.setDate(date.getDate() + 1)) {
    if (blocked.has(dateKey(date))) return true;
  }
  return false;
}

function GuestCounter({
  label,
  detail,
  value,
  minimum,
  maximum,
  onChange,
}: {
  label: string;
  detail: string;
  value: number;
  minimum: number;
  maximum: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-sand-200 bg-white px-4 py-3">
      <div>
        <p className="text-sm font-bold text-ink">{label}</p>
        <p className="text-xs text-sand-600">{detail}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(minimum, value - 1))}
          disabled={value <= minimum}
          className="grid size-9 place-items-center rounded-full border border-sand-300 text-sand-700 transition hover:border-terracotta-300 hover:text-terracotta-700 disabled:cursor-not-allowed disabled:opacity-35"
          aria-label={`Remove one ${label.toLowerCase()}`}
        >
          <Minus className="size-4" aria-hidden="true" />
        </button>
        <span className="w-5 text-center text-sm font-bold text-ink">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(maximum, value + 1))}
          disabled={value >= maximum}
          className="grid size-9 place-items-center rounded-full border border-sand-300 text-sand-700 transition hover:border-terracotta-300 hover:text-terracotta-700 disabled:cursor-not-allowed disabled:opacity-35"
          aria-label={`Add one ${label.toLowerCase()}`}
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export function BookingModal({
  propertyId,
  propertyTitle,
  pricePerNight,
  maxGuests,
  blockedDates,
  onClose,
  onSuccess,
}: {
  propertyId: string;
  propertyTitle: string;
  pricePerNight: number;
  maxGuests: number;
  blockedDates: string[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const blocked = blockedDates.map(parseDate);
  const blockedKeys = new Set(blockedDates);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [range, setRange] = useState<DateRange>();
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [specialRequests, setSpecialRequests] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const nights = nightsBetween(range);
  const total = nights * pricePerNight;
  const guestTotal = adults + children;
  const validRange = nights > 0 && !includesBlockedDate(range, blockedKeys);

  useEffect(() => {
    closeButton.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const submit = () => {
    setError(null);
    if (!range?.from || !range.to || !validRange) {
      const message = "Choose an available check-in and check-out date.";
      setError(message);
      toast.error(message);
      return;
    }
    if (guestTotal < 1 || guestTotal > maxGuests) {
      const message = `This home accepts up to ${maxGuests} guests.`;
      setError(message);
      toast.error(message);
      return;
    }

    startTransition(async () => {
      const result = await createBookingAction({
        propertyId,
        checkInDate: dateKey(range.from!),
        checkOutDate: dateKey(range.to!),
        adults,
        children,
        specialRequests: specialRequests.trim() || undefined,
      });
      if (!result.ok) {
        setError(result.message);
        toast.error(result.message);
        return;
      }
      onSuccess();
    });
  };

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-ink/65 p-4 backdrop-blur-sm"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-modal-title"
        className="my-6 w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/70 bg-sand-50 shadow-float"
      >
        <header className="flex items-start justify-between gap-4 border-b border-sand-200 px-5 py-5 sm:px-7">
          <div>
            <p className="eyebrow">Booking request</p>
            <h2 id="booking-modal-title" className="mt-1 font-serif text-3xl font-semibold text-ink">
              Plan your stay at {propertyTitle}
            </h2>
          </div>
          <button
            ref={closeButton}
            type="button"
            onClick={onClose}
            className="grid size-10 shrink-0 place-items-center rounded-full border border-sand-200 text-sand-700 transition hover:bg-sand-200 hover:text-ink"
            aria-label="Close booking dialog"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>

        <div className="grid gap-0 lg:grid-cols-[1.1fr_.9fr]">
          <div className="border-b border-sand-200 p-4 sm:p-6 lg:border-b-0 lg:border-r">
            <p className="mb-3 text-sm font-bold text-ink">Choose your dates</p>
            <DayPicker
              className="keyrak-calendar mx-auto"
              mode="range"
              selected={range}
              onSelect={setRange}
              min={1}
              excludeDisabled
              defaultMonth={startDate}
              startMonth={new Date(startDate.getFullYear(), startDate.getMonth())}
              endMonth={new Date(startDate.getFullYear() + 2, 11)}
              showOutsideDays
              fixedWeeks
              disabled={[{ before: startDate }, ...blocked]}
              modifiers={{ blocked }}
              modifiersClassNames={{ blocked: "bg-red-100 text-red-600 line-through" }}
              footer={
                range?.from && range.to
                  ? `${nights} night${nights === 1 ? "" : "s"} selected`
                  : "Select a check-in and check-out date"
              }
            />
          </div>

          <div className="space-y-5 p-5 sm:p-7">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <UsersRound className="size-4 text-terracotta-600" aria-hidden="true" />
                <p className="text-sm font-bold text-ink">Guests</p>
              </div>
              <div className="space-y-2">
                <GuestCounter
                  label="Adults"
                  detail="Ages 13 or above"
                  value={adults}
                  minimum={1}
                  maximum={Math.max(1, maxGuests - children)}
                  onChange={setAdults}
                />
                <GuestCounter
                  label="Children"
                  detail="Ages 2–12"
                  value={children}
                  minimum={0}
                  maximum={Math.max(0, maxGuests - adults)}
                  onChange={setChildren}
                />
              </div>
            </div>

            <label className="block text-sm font-bold text-ink">
              Special requests <span className="font-medium text-sand-600">(optional)</span>
              <textarea
                value={specialRequests}
                onChange={(event) => setSpecialRequests(event.target.value.slice(0, 2_000))}
                rows={3}
                className="mt-2 w-full rounded-2xl border border-sand-300 bg-white px-4 py-3 text-sm font-medium text-ink outline-none transition placeholder:text-sand-500 focus:border-majorelle-400 focus:ring-2 focus:ring-majorelle-100"
                placeholder="Arrival time, accessibility needs, or a celebration…"
              />
            </label>

            <div className="rounded-2xl bg-sand-100 p-4 text-sm">
              <div className="flex justify-between gap-4 text-sand-700">
                <span>{formatPrice(pricePerNight)} × {nights || 0} nights</span>
                <span>{formatPrice(total)}</span>
              </div>
              <div className="mt-3 flex justify-between gap-4 border-t border-sand-200 pt-3 font-bold text-ink">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>

            {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">{error}</p>}

            <Button
              type="button"
              className="w-full"
              disabled={isPending || !validRange || guestTotal > maxGuests}
              onClick={submit}
            >
              {isPending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
              {isPending ? "Sending request…" : "Request booking"}
            </Button>
            <p className="text-center text-xs leading-5 text-sand-600">
              Your request is created as pending. The host confirms it before any payment.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
