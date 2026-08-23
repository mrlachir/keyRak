"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

import { apiErrorMessage, apiFetch } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import type {
  ActionResult,
  AiDescriptionRequest,
  AiDescriptionResponse,
  AdminBooking,
  BookingStatus,
  CreatePropertyRequest,
  Property,
} from "@/types";

async function verifyAdmin(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return "Sign in with Google to continue.";
  if (session.user.role !== "ADMIN") return "Administrator access is required.";
  return null;
}

export async function updateBookingStatusAction(
  bookingId: string,
  status: Extract<BookingStatus, "CONFIRMED" | "CANCELLED">,
): Promise<ActionResult<AdminBooking>> {
  const authorizationError = await verifyAdmin();
  if (authorizationError) return { ok: false, message: authorizationError };
  if (!bookingId || !["CONFIRMED", "CANCELLED"].includes(status)) {
    return { ok: false, message: "Choose a valid booking decision." };
  }

  try {
    const booking = await apiFetch<AdminBooking>(
      `/api/admin/bookings/${encodeURIComponent(bookingId)}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
      },
    );
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/bookings");
    revalidatePath("/profile");
    revalidatePath(`/properties/${booking.propertyId}`);
    return { ok: true, data: booking };
  } catch (error) {
    return {
      ok: false,
      message: apiErrorMessage(error, "The booking decision could not be saved."),
    };
  }
}

export async function generatePropertyDescriptionAction(
  input: AiDescriptionRequest,
): Promise<ActionResult<AiDescriptionResponse>> {
  const authorizationError = await verifyAdmin();
  if (authorizationError) return { ok: false, message: authorizationError };
  if (!input.title.trim() || input.amenities.length === 0) {
    return { ok: false, message: "Add a title and at least one amenity before generating copy." };
  }

  try {
    const response = await apiFetch<AiDescriptionResponse>("/api/ai/description", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return { ok: true, data: response };
  } catch (error) {
    return {
      ok: false,
      message: apiErrorMessage(error, "The AI description could not be generated."),
    };
  }
}

export async function createPropertyAction(
  input: CreatePropertyRequest,
): Promise<ActionResult<Property>> {
  const authorizationError = await verifyAdmin();
  if (authorizationError) return { ok: false, message: authorizationError };
  if (!input.title.trim() || !input.description.trim() || input.media.length === 0) {
    return { ok: false, message: "Title, description, and at least one image are required." };
  }
  if (input.maxGuests < 1 || input.pricePerNight <= 0) {
    return { ok: false, message: "Price and guest capacity must be greater than zero." };
  }

  try {
    const property = await apiFetch<Property>("/api/properties", {
      method: "POST",
      body: JSON.stringify(input),
    });
    revalidatePath("/search");
    revalidatePath("/admin/dashboard");
    return { ok: true, data: property };
  } catch (error) {
    return {
      ok: false,
      message: apiErrorMessage(error, "The property could not be created."),
    };
  }
}
