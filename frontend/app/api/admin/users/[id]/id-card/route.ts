import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiFetchResponse } from "@/lib/api";
import { isUserId } from "@/lib/user-management";

export const dynamic = "force-dynamic";

const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  Vary: "Cookie",
};
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp", "image/tiff", "image/heic", "image/heif", "application/pdf"]);

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!isUserId(id) || session?.user?.role !== "ADMIN" || !session.accessToken) return unavailable();
    // The transport forwards the server-side Bearer token. Never put it in an image URL.
    const response = await apiFetchResponse(`/api/admin/users/${id}/id-card`, {
      headers: { Accept: "image/*,application/pdf" },
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(20_000),
    });
    const contentType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
    if (!response.body || !allowedTypes.has(contentType)) {
      await response.body?.cancel();
      return unavailable();
    }
    // Stream; do not buffer the document in a Server Action or expose storage filenames.
    return new Response(response.body, {
      headers: { ...privateHeaders, "Content-Type": contentType, "Content-Disposition": "inline; filename=identity-document" },
    });
  } catch {
    // Intentionally indistinguishable: not signed in, forbidden, missing, or unavailable upstream.
    return unavailable();
  }
}

function unavailable() {
  return new Response("Document not available. Return to user management and try again.", {
    status: 404, headers: { ...privateHeaders, "Content-Type": "text/plain; charset=utf-8" },
  });
}
