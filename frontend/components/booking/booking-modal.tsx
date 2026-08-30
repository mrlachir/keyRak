"use client";

import { DayPicker, type DateRange } from "@daypicker/react";
import { Banknote, CircleCheck, CreditCard, FileCheck2, LoaderCircle, Minus, Plus, ShieldCheck, Upload, UsersRound, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { createBookingAction } from "@/app/actions/booking";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import type { PaymentMethod } from "@/types";

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

function formatTestCardNumber(value: string): string {
  return value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)} / ${digits.slice(2)}` : digits;
}

function isValidFutureExpiry(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 4) return false;

  const month = Number(digits.slice(0, 2));
  const year = 2_000 + Number(digits.slice(2));
  if (month < 1 || month > 12) return false;

  const today = new Date();
  return year > today.getFullYear() || (year === today.getFullYear() && month >= today.getMonth() + 1);
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
  hasSavedIdCard = false,
  onClose,
  onSuccess,
}: {
  propertyId: string;
  propertyTitle: string;
  pricePerNight: number;
  maxGuests: number;
  blockedDates: string[];
  hasSavedIdCard?: boolean;
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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH_ON_ARRIVAL");
  const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");
  const [cardExpiry, setCardExpiry] = useState("12 / 30");
  const [cardCvc, setCardCvc] = useState("123");
  const [idCard, setIdCard] = useState<File | null>(null);
  const [specialRequests, setSpecialRequests] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const nights = nightsBetween(range);
  const total = nights * pricePerNight;
  const guestTotal = adults + children;
  const validRange = nights > 0 && !includesBlockedDate(range, blockedKeys);
  const cardDetailsAreValid =
    cardNumber.replace(/\D/g, "") === "4242424242424242" &&
    isValidFutureExpiry(cardExpiry) &&
    /^\d{3}$/.test(cardCvc);

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
    if (isPending) return;
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
    if (paymentMethod === "CREDIT_CARD" && !cardDetailsAreValid) {
      const message = "Use the KEYRAK test card 4242 4242 4242 4242 with a valid future expiry and 3-digit CVC.";
      setError(message);
      toast.error("Test card details are incomplete", { description: message });
      return;
    }
    if (!idCard && !hasSavedIdCard) {
      const message = "Upload a government ID image or PDF.";
      setError(message);
      toast.error(message);
      return;
    }
    if (idCard && idCard.size > 8 * 1024 * 1024) {
      const message = "The government ID file must be 8 MB or smaller.";
      setError(message);
      toast.error(message);
      return;
    }
    if (idCard && !(idCard.type === "application/pdf" || idCard.type.startsWith("image/"))) {
      const message = "Government ID must be an image or PDF file.";
      setError(message);
      toast.error(message);
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("propertyId", propertyId);
      formData.set("checkInDate", dateKey(range.from!));
      formData.set("checkOutDate", dateKey(range.to!));
      formData.set("adults", String(adults));
      formData.set("children", String(children));
      formData.set("paymentMethod", paymentMethod);
      formData.set("specialRequests", specialRequests.trim());
      if (idCard) formData.set("idCard", idCard);
      const result = await createBookingAction(formData);
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

            <fieldset>
              <legend className="text-sm font-bold text-ink">Payment method</legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <label className={`cursor-pointer rounded-2xl border p-3 transition ${paymentMethod === "CREDIT_CARD" ? "border-majorelle-400 bg-majorelle-50 ring-2 ring-majorelle-100" : "border-sand-200 bg-white hover:border-sand-300"}`}>
                  <span className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="payment-method"
                      value="CREDIT_CARD"
                      checked={paymentMethod === "CREDIT_CARD"}
                      onChange={() => {
                        setPaymentMethod("CREDIT_CARD");
                        setError(null);
                      }}
                      className="mt-1 size-4 border-sand-300 text-majorelle-600 focus:ring-majorelle-400"
                    />
                    <span>
                      <span className="flex items-center gap-2 text-sm font-bold text-ink"><CreditCard className="size-4 text-majorelle-600" aria-hidden="true" /> Test credit card</span>
                      <span className="mt-1 block text-xs leading-5 text-sand-600">Demo checkout—no real charge.</span>
                    </span>
                  </span>
                </label>
                <label className={`cursor-pointer rounded-2xl border p-3 transition ${paymentMethod === "CASH_ON_ARRIVAL" ? "border-olive-400 bg-olive-50 ring-2 ring-olive-100" : "border-sand-200 bg-white hover:border-sand-300"}`}>
                  <span className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="payment-method"
                      value="CASH_ON_ARRIVAL"
                      checked={paymentMethod === "CASH_ON_ARRIVAL"}
                      onChange={() => {
                        setPaymentMethod("CASH_ON_ARRIVAL");
                        setError(null);
                      }}
                      className="mt-1 size-4 border-sand-300 text-olive-600 focus:ring-olive-400"
                    />
                    <span>
                      <span className="flex items-center gap-2 text-sm font-bold text-ink"><Banknote className="size-4 text-olive-700" aria-hidden="true" /> Pay on arrival</span>
                      <span className="mt-1 block text-xs leading-5 text-sand-600">Settle with the host at check-in.</span>
                    </span>
                  </span>
                </label>
              </div>

              {paymentMethod === "CREDIT_CARD" && (
                <div className="mt-3 rounded-2xl border border-majorelle-100 bg-majorelle-50/60 p-4" aria-label="Test credit card form">
                  <div className="mb-4 flex items-start gap-2 rounded-xl border border-majorelle-100 bg-white/70 px-3 py-2.5 text-xs leading-5 text-majorelle-800">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <span><strong>Safe demo payment.</strong> Use the test details below. No charge is made and card details never leave this browser.</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-bold uppercase tracking-[0.1em] text-sand-700 sm:col-span-2">
                      Card number
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        value={cardNumber}
                        onChange={(event) => {
                          setCardNumber(formatTestCardNumber(event.target.value));
                          setError(null);
                        }}
                        maxLength={19}
                        aria-invalid={cardNumber.replace(/\D/g, "") !== "4242424242424242"}
                        className="mt-2 min-h-11 w-full rounded-xl border border-sand-300 bg-white px-3 text-sm font-semibold tracking-[0.08em] text-ink outline-none transition focus:border-majorelle-400 focus:ring-2 focus:ring-majorelle-100"
                      />
                    </label>
                    <label className="text-xs font-bold uppercase tracking-[0.1em] text-sand-700">
                      Expiry
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="MM / YY"
                        value={cardExpiry}
                        onChange={(event) => {
                          setCardExpiry(formatExpiry(event.target.value));
                          setError(null);
                        }}
                        maxLength={7}
                        aria-invalid={!isValidFutureExpiry(cardExpiry)}
                        className="mt-2 min-h-11 w-full rounded-xl border border-sand-300 bg-white px-3 text-sm font-semibold text-ink outline-none transition placeholder:text-sand-400 focus:border-majorelle-400 focus:ring-2 focus:ring-majorelle-100"
                      />
                    </label>
                    <label className="text-xs font-bold uppercase tracking-[0.1em] text-sand-700">
                      CVC
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        value={cardCvc}
                        onChange={(event) => {
                          setCardCvc(event.target.value.replace(/\D/g, "").slice(0, 3));
                          setError(null);
                        }}
                        maxLength={3}
                        aria-invalid={!/^\d{3}$/.test(cardCvc)}
                        className="mt-2 min-h-11 w-full rounded-xl border border-sand-300 bg-white px-3 text-sm font-semibold text-ink outline-none transition focus:border-majorelle-400 focus:ring-2 focus:ring-majorelle-100"
                      />
                    </label>
                  </div>
                  <p className={`mt-3 flex items-center gap-1.5 text-xs font-semibold ${cardDetailsAreValid ? "text-olive-700" : "text-terracotta-700"}`}>
                    {cardDetailsAreValid ? <CircleCheck className="size-4" aria-hidden="true" /> : <CreditCard className="size-4" aria-hidden="true" />}
                    {cardDetailsAreValid ? "Test card verified — ready to submit." : "Enter 4242 4242 4242 4242, a future expiry, and a 3-digit CVC."}
                  </p>
                </div>
              )}
            </fieldset>

            {hasSavedIdCard && (
              <p className="flex items-start gap-2 rounded-2xl border border-olive-200 bg-olive-50 p-4 text-sm font-semibold text-olive-800">
                <FileCheck2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />ID Card already on file in your profile. No need to upload it again.
              </p>
            )}
            <label className="block text-sm font-bold text-ink">
              {hasSavedIdCard ? "Replace government ID (optional)" : "Upload Government ID *"}
              <span className="mt-2 flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-terracotta-300 bg-terracotta-50 px-4 py-3 transition hover:border-terracotta-400 hover:bg-terracotta-100">
                {idCard ? <FileCheck2 className="size-5 shrink-0 text-olive-700" aria-hidden="true" /> : <Upload className="size-5 shrink-0 text-terracotta-600" aria-hidden="true" />}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-ink">{idCard ? idCard.name : "Choose an image or PDF"}</span>
                  <span className="block text-xs font-medium text-sand-600">{hasSavedIdCard ? "Optional replacement" : "Saved to your profile for future trips"} · Maximum 8 MB</span>
                </span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  required={!hasSavedIdCard}
                  disabled={isPending}
                  onChange={(event) => setIdCard(event.target.files?.[0] ?? null)}
                  className="sr-only"
                />
              </span>
            </label>

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
              disabled={isPending || !validRange || guestTotal > maxGuests || (!idCard && !hasSavedIdCard) || (paymentMethod === "CREDIT_CARD" && !cardDetailsAreValid)}
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
