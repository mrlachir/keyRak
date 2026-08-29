import "server-only";

import { apiFetch } from "@/lib/api";
import { requireAdminSession, requireAuthenticatedSession } from "@/lib/access";
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
