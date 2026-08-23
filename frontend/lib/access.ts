import "server-only";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";

function safeReturnTo(value: string): string {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function requireAuthenticatedSession(returnTo = "/profile") {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(safeReturnTo(returnTo))}`);
  }
  return session;
}

export async function requireAdminSession(returnTo = "/admin/dashboard") {
  const session = await requireAuthenticatedSession(returnTo);
  if (session.user.role !== "ADMIN") {
    redirect("/profile?notice=admin-access-required");
  }
  return session;
}
