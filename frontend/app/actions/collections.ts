"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

import { apiErrorMessage, apiFetch } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import type { ActionResult, NotificationInbox } from "@/types";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getWishlistIdsAction(): Promise<ActionResult<string[]>> {
  if (!(await getServerSession(authOptions))?.user) return { ok: false, message: "Sign in to view your saved stays." };
  try {
    return { ok: true, data: await apiFetch<string[]>("/api/users/me/wishlist/ids") };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error, "Your wishlist could not be loaded.") };
  }
}

export async function setWishlistAction(propertyId: string, saved: boolean): Promise<ActionResult<null>> {
  if (!(await getServerSession(authOptions))?.user) return { ok: false, message: "Sign in to save a stay." };
  if (typeof propertyId !== "string" || !uuid.test(propertyId) || typeof saved !== "boolean") {
    return { ok: false, message: "Choose a valid property." };
  }
  try {
    await apiFetch<void>(`/api/users/me/wishlist/${propertyId}`, { method: saved ? "POST" : "DELETE" });
    revalidatePath("/wishlist");
    return { ok: true, data: null };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error, "Your wishlist could not be updated.") };
  }
}

export async function getNotificationsAction(): Promise<ActionResult<NotificationInbox>> {
  if (!(await getServerSession(authOptions))?.user) return { ok: false, message: "Sign in to view notifications." };
  try {
    return { ok: true, data: await apiFetch<NotificationInbox>("/api/users/me/notifications") };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error, "Notifications could not be loaded.") };
  }
}

export async function markNotificationReadAction(id: string): Promise<ActionResult<null>> {
  if (!(await getServerSession(authOptions))?.user) return { ok: false, message: "Sign in to manage notifications." };
  if (typeof id !== "string" || !uuid.test(id)) return { ok: false, message: "Choose a valid notification." };
  try {
    await apiFetch<void>(`/api/users/me/notifications/${id}/read`, { method: "PATCH" });
    return { ok: true, data: null };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error, "The notification could not be marked as read.") };
  }
}

export async function markAllNotificationsReadAction(): Promise<ActionResult<null>> {
  if (!(await getServerSession(authOptions))?.user) return { ok: false, message: "Sign in to manage notifications." };
  try {
    await apiFetch<void>("/api/users/me/notifications/read-all", { method: "PATCH" });
    return { ok: true, data: null };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error, "Notifications could not be marked as read.") };
  }
}
