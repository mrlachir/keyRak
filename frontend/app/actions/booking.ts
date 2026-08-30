"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

import { apiErrorMessage, apiFetch } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import type { ActionResult, Booking, CreateBookingRequest, PaymentMethod } from "@/types";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export async function createBookingAction(
  formData: FormData,
): Promise<ActionResult<Booking>> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { ok: false, message: "Sign in with Google before requesting this stay." };
  }

  const paymentMethod = String(formData.get("paymentMethod") ?? "") as PaymentMethod;
  const input: CreateBookingRequest = {
    propertyId: String(formData.get("propertyId") ?? ""),
    checkInDate: String(formData.get("checkInDate") ?? ""),
    checkOutDate: String(formData.get("checkOutDate") ?? ""),
    adults: Number(formData.get("adults")),
    children: Number(formData.get("children")),
    paymentMethod,
    specialRequests: String(formData.get("specialRequests") ?? "").trim() || undefined,
  };
  const idCard = formData.get("idCard");

  if (!input.propertyId.trim()) {
    return { ok: false, message: "Choose a valid property." };
  }
  if (!datePattern.test(input.checkInDate) || !datePattern.test(input.checkOutDate)) {
    return { ok: false, message: "Choose valid check-in and check-out dates." };
  }
  if (input.checkOutDate <= input.checkInDate) {
    return { ok: false, message: "Check-out must be after check-in." };
  }
  if (!Number.isInteger(input.adults) || input.adults < 1 || input.children < 0) {
    return { ok: false, message: "At least one adult is required." };
  }
  if (!Number.isInteger(input.children)) {
    return { ok: false, message: "Choose a valid number of children." };
  }
  if (!(["CREDIT_CARD", "CASH_ON_ARRIVAL"] as const).includes(input.paymentMethod)) {
    return { ok: false, message: "Choose a valid payment method." };
  }
  const hasNewIdCard = idCard instanceof File && idCard.size > 0;
  if (hasNewIdCard && idCard.size > 8 * 1024 * 1024) {
    return { ok: false, message: "The government ID file must be 8 MB or smaller." };
  }
  if (hasNewIdCard && !(idCard.type === "application/pdf" || idCard.type.startsWith("image/"))) {
    return { ok: false, message: "Government ID must be an image or PDF file." };
  }

  try {
    const multipartBody = new FormData();
    multipartBody.set(
      "booking",
      new Blob([JSON.stringify(input)], { type: "application/json" }),
      "booking.json",
    );
    if (hasNewIdCard) multipartBody.set("idCard", idCard, idCard.name);
    const booking = await apiFetch<Booking>("/api/bookings", {
      method: "POST",
      body: multipartBody,
    });
    revalidatePath(`/properties/${input.propertyId}`);
    revalidatePath("/profile");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/bookings");
    return { ok: true, data: booking };
  } catch (error) {
    return {
      ok: false,
      message: apiErrorMessage(error, "Your booking request could not be submitted."),
    };
  }
}

export async function requestBookingCancellationAction(
  bookingId: string,
): Promise<ActionResult<Booking>> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { ok: false, message: "Sign in with Google to manage this reservation." };
  }
  if (!bookingId.trim()) {
    return { ok: false, message: "Choose a valid reservation." };
  }

  try {
    const booking = await apiFetch<Booking>(
      `/api/bookings/${encodeURIComponent(bookingId)}/request-cancel`,
      { method: "PATCH" },
    );
    revalidatePath("/profile");
    revalidatePath("/admin/bookings");
    return { ok: true, data: booking };
  } catch (error) {
    return {
      ok: false,
      message: apiErrorMessage(error, "The cancellation request could not be submitted."),
    };
  }
}

export async function cancelPendingBookingAction(
  bookingId: string,
): Promise<ActionResult<Booking>> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { ok: false, message: "Sign in with Google to manage this reservation." };
  }
  if (!bookingId.trim()) {
    return { ok: false, message: "Choose a valid reservation." };
  }

  try {
    const booking = await apiFetch<Booking>(
      `/api/bookings/${encodeURIComponent(bookingId)}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status: "CANCELLED" }),
      },
    );
    revalidatePath("/profile");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/bookings");
    revalidatePath(`/properties/${booking.propertyId}`);
    return { ok: true, data: booking };
  } catch (error) {
    return {
      ok: false,
      message: apiErrorMessage(error, "The reservation could not be cancelled."),
    };
  }
}
