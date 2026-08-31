import type { UserRole } from "@/types";

export function isUserId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function isUserRole(value: unknown): value is UserRole {
  return value === "ADMIN" || value === "CLIENT";
}

export function idCardPreviewPath(id: string): string {
  if (!isUserId(id)) throw new Error("Invalid user reference");
  return `/api/admin/users/${id}/id-card`;
}

export function safeAvatarUrl(value?: string | null): string | undefined {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}
