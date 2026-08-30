"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

import { ApiError, apiErrorMessage, apiFetch } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import type { ActionResult, CreateReviewRequest, Review } from "@/types";

export async function createReviewAction(
  propertyId: string,
  input: CreateReviewRequest,
): Promise<ActionResult<Review>> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { ok: false, message: "Sign in with Google to leave a review." };
  if (!propertyId.trim() || !input || !Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    return { ok: false, message: "Choose a rating between 1 and 5 stars." };
  }
  if (typeof input.comment !== "string" || !input.comment.trim() || input.comment.trim().length > 2_000) {
    return { ok: false, message: "Write a review of up to 2,000 characters." };
  }

  try {
    const review = await apiFetch<Review>(`/api/properties/${encodeURIComponent(propertyId)}/reviews`, {
      method: "POST",
      body: JSON.stringify({ rating: input.rating, comment: input.comment.trim() }),
    });
    revalidatePath(`/properties/${propertyId}`);
    return { ok: true, data: review };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof ApiError && error.status === 403
        ? "You can review confirmed stays from your check-in date."
        : apiErrorMessage(error, "Your review could not be published."),
    };
  }
}

export async function deleteReviewAction(
  reviewId: string,
  propertyId: string,
): Promise<ActionResult<null>> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { ok: false, message: "Sign in with Google to manage your review." };
  if (!reviewId.trim()) return { ok: false, message: "Choose a valid review." };

  try {
    await apiFetch<void>(`/api/reviews/${encodeURIComponent(reviewId)}`, { method: "DELETE" });
    revalidatePath(`/properties/${propertyId}`);
    return { ok: true, data: null };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error, "The review could not be removed.") };
  }
}
