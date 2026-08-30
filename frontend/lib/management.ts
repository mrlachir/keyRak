import "server-only";

import { getServerSession } from "next-auth";

import { apiFetch } from "@/lib/api";
import { requireAdminSession, requireAuthenticatedSession } from "@/lib/access";
import { authOptions } from "@/lib/auth";
import type { AdminBooking, AdminDashboardMetrics, Trip, UserProfileResponse } from "@/types";

export async function getAdminDashboardMetrics(): Promise<AdminDashboardMetrics> {
  await requireAdminSession("/admin/dashboard");
  return apiFetch<AdminDashboardMetrics>("/api/admin/dashboard/metrics");
}

export async function getPendingBookings(): Promise<AdminBooking[]> {
  await requireAdminSession("/admin/bookings");
  return apiFetch<AdminBooking[]>("/api/admin/bookings");
}

export async function getMyTrips(): Promise<Trip[]> {
  await requireAuthenticatedSession("/profile");
  return apiFetch<Trip[]>("/api/bookings/me");
}

export async function getMyProfile(): Promise<UserProfileResponse> {
  await requireAuthenticatedSession("/profile");
  return apiFetch<UserProfileResponse>("/api/users/me");
}

export async function getOptionalProfile(): Promise<UserProfileResponse | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  try {
    return await apiFetch<UserProfileResponse>("/api/users/me");
  } catch {
    return null;
  }
}
