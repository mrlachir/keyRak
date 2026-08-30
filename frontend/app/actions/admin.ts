"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

import { apiErrorMessage, apiFetch } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import { mediaGroups, validatePropertyMedia, type MediaFiles } from "@/lib/media-inputs";
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

export async function moderateCancellationRequestAction(
  bookingId: string,
  approved: boolean,
): Promise<ActionResult<AdminBooking>> {
  const authorizationError = await verifyAdmin();
  if (authorizationError) return { ok: false, message: authorizationError };
  if (!bookingId.trim()) {
    return { ok: false, message: "Choose a valid cancellation request." };
  }

  try {
    const booking = await apiFetch<AdminBooking>(
      `/api/admin/bookings/${encodeURIComponent(bookingId)}/cancellation-request`,
      {
        method: "PATCH",
        body: JSON.stringify({ approved }),
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
      message: apiErrorMessage(error, "The cancellation decision could not be saved."),
    };
  }
}

export async function generatePropertyDescriptionAction(
  input: AiDescriptionRequest,
): Promise<ActionResult<AiDescriptionResponse>> {
  const authorizationError = await verifyAdmin();
  if (authorizationError) return { ok: false, message: authorizationError };
  if (!input.title.trim() || !input.city.trim()) {
    return { ok: false, message: "Add a title and city before generating copy." };
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
  formData: FormData,
): Promise<ActionResult<Property>> {
  return saveProperty(formData);
}

export async function updatePropertyAction(id: string, formData: FormData): Promise<ActionResult<Property>> {
  if (!id) return { ok: false, message: "Choose a property to update." };
  return saveProperty(formData, id);
}

function revalidatePropertyPages(id?: string) {
  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/properties");
  revalidatePath("/admin/bookings");
  revalidatePath("/profile");
  if (id) {
    revalidatePath(`/properties/${id}`);
    revalidatePath(`/admin/properties/${id}/edit`);
  }
}

export async function featurePropertyAction(id: string, isFeatured: boolean): Promise<ActionResult<Property>> {
  const authorizationError = await verifyAdmin();
  if (authorizationError) return { ok: false, message: authorizationError };
  if (!id || typeof isFeatured !== "boolean") return { ok: false, message: "Choose a valid feature setting." };
  try {
    const property = await apiFetch<Property>(`/api/properties/${encodeURIComponent(id)}/featured`, {
      method: "PATCH", body: JSON.stringify({ isFeatured }),
    });
    revalidatePropertyPages(id);
    return { ok: true, data: property };
  } catch (error) { return { ok: false, message: apiErrorMessage(error, "The featured selection could not be saved.") }; }
}

export async function deletePropertyAction(id: string): Promise<ActionResult<null>> {
  const authorizationError = await verifyAdmin();
  if (authorizationError) return { ok: false, message: authorizationError };
  if (!id) return { ok: false, message: "Choose a property to delete." };
  try {
    await apiFetch<void>(`/api/properties/${encodeURIComponent(id)}`, { method: "DELETE" });
    revalidatePropertyPages(id);
    return { ok: true, data: null };
  } catch (error) { return { ok: false, message: apiErrorMessage(error, "The property could not be deleted.") }; }
}

async function saveProperty(formData: FormData, id?: string): Promise<ActionResult<Property>> {
  const authorizationError = await verifyAdmin();
  if (authorizationError) return { ok: false, message: authorizationError };

  const propertyJson = formData.get("property");
  let input: CreatePropertyRequest;
  try {
    const parsed: unknown = JSON.parse(String(propertyJson ?? ""));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, message: "Property details could not be read." };
    }
    input = parsed as CreatePropertyRequest;
  } catch {
    return { ok: false, message: "Property details could not be read." };
  }
  const files: MediaFiles = { IMAGE: [], IMAGE_360: [], VIDEO: [] };
  for (const group of mediaGroups) {
    files[group.type] = formData.getAll(group.part).filter((value): value is File => value instanceof File && value.size > 0);
  }
  if (typeof input.title !== "string" || typeof input.description !== "string" || !input.title.trim() || !input.description.trim()) {
    return { ok: false, message: "Title and description are required." };
  }
  if (!Number.isFinite(input.maxGuests) || !Number.isFinite(input.pricePerNight) || input.maxGuests < 1 || input.pricePerNight <= 0) {
    return { ok: false, message: "Price and guest capacity must be greater than zero." };
  }
  const mediaError = validatePropertyMedia(input.media ?? [], files);
  if (mediaError) return { ok: false, message: mediaError };

  try {
    const multipartBody = new FormData();
    multipartBody.set(
      "property",
      new Blob([JSON.stringify(input)], { type: "application/json" }),
      "property.json",
    );
    for (const group of mediaGroups) {
      files[group.type].forEach(file => multipartBody.append(group.part, file, file.name));
    }
    const property = await apiFetch<Property>(id ? `/api/properties/${encodeURIComponent(id)}` : "/api/properties", {
      method: id ? "PUT" : "POST",
      body: multipartBody,
    });
    revalidatePropertyPages(property.id);
    return { ok: true, data: property };
  } catch (error) {
    return {
      ok: false,
      message: apiErrorMessage(error, "The property could not be created."),
    };
  }
}
