"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

import { apiErrorMessage, apiFetch } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import type { ActionResult, Booking, CreateBookingRequest } from "@/types";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export async function createBookingAction(
  input: CreateBookingRequest,
): Promise<ActionResult<Booking>> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { ok: false, message: "Sign in with Google before requesting this stay." };
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

  try {
    const booking = await apiFetch<Booking>("/api/bookings", {
      method: "POST",
      body: JSON.stringify(input),
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
