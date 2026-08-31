"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { apiFetch, apiErrorMessage } from "@/lib/api";
import { isUserId, isUserRole } from "@/lib/user-management";
import type { ActionResult, AdminUser, UserRole } from "@/types";

async function verifyAdmin() {
  const session = await getServerSession(authOptions);
  return session?.user?.role === "ADMIN" && Boolean(session.accessToken);
}

export async function getAdminUserAction(id: string): Promise<ActionResult<AdminUser>> {
  try {
    if (!await verifyAdmin()) return { ok: false, message: "Administrator access is required." };
    if (!isUserId(id)) return { ok: false, message: "Choose a valid user." };
    return { ok: true, data: await apiFetch<AdminUser>(`/api/admin/users/${id}`) };
  } catch (error) { return { ok: false, message: apiErrorMessage(error, "This user is no longer available.") }; }
}

export async function updateUserRoleAction(id: string, role: UserRole): Promise<ActionResult<AdminUser>> {
  try {
    if (!await verifyAdmin()) return { ok: false, message: "Administrator access is required." };
    if (!isUserId(id) || !isUserRole(role)) return { ok: false, message: "Choose a valid user and role." };
    const user = await apiFetch<AdminUser>(`/api/admin/users/${id}/role`, {
      method: "PATCH", body: JSON.stringify({ role }),
    });
    revalidatePath("/admin/users");
    return { ok: true, data: user };
  } catch (error) { return { ok: false, message: apiErrorMessage(error, "The role could not be changed.") }; }
}

export async function deleteUserAction(id: string, confirmationEmail: string): Promise<ActionResult<null>> {
  try {
    if (!await verifyAdmin()) return { ok: false, message: "Administrator access is required." };
    if (!isUserId(id) || typeof confirmationEmail !== "string") return { ok: false, message: "Choose a valid user." };
    const user = await apiFetch<AdminUser>(`/api/admin/users/${id}`);
    if (confirmationEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
      return { ok: false, message: "Type the user's email to confirm permanent removal." };
    }
    await apiFetch<void>(`/api/admin/users/${id}`, { method: "DELETE" });
    revalidatePath("/admin/users");
    revalidatePath("/admin/bookings");
    revalidatePath("/admin/dashboard");
    revalidatePath("/properties/[id]", "page");
    return { ok: true, data: null };
  } catch (error) { return { ok: false, message: apiErrorMessage(error, "The user could not be removed.") }; }
}
