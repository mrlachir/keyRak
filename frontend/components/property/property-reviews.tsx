"use client";

import { BadgeCheck, LoaderCircle, MessageSquare, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";

import { createReviewAction, deleteReviewAction } from "@/app/actions/reviews";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Review } from "@/types";

export function PropertyReviews({
  propertyId,
  initialReviews,
  currentUserId,
  isAdmin = false,
  available = true,
}: {
  propertyId: string;
  initialReviews: Review[];
  currentUserId?: string | null;
  isAdmin?: boolean;
  available?: boolean;
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, startSubmitting] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;
  const alreadyReviewed = reviews.some((review) => review.authorId === currentUserId);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    if (rating < 1 || rating > 5 || !comment.trim()) {
      toast.error("Choose a star rating and write your review.");
      return;
    }
    startSubmitting(async () => {
      const result = await createReviewAction(propertyId, { rating, comment });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setReviews((current) => [result.data, ...current]);
      setRating(0);
      setComment("");
      toast.success("Your verified review is now published.");
    });
  };

  const remove = async (reviewId: string) => {
    if (removingId || !window.confirm("Remove this review?")) return;
    setRemovingId(reviewId);
    const result = await deleteReviewAction(reviewId, propertyId);
    setRemovingId(null);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    setReviews((current) => current.filter((review) => review.id !== reviewId));
    toast.success("Review removed.");
  };

  return (
    <section id="reviews" className="border-t border-sand-200 py-9" aria-labelledby="property-reviews-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow">Verified guest reviews</p>
          <h2 id="property-reviews-title" className="mt-2 font-serif text-3xl font-semibold text-ink">Stories from real stays.</h2>
        </div>
        {reviews.length > 0 && (
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-sand-200 bg-sand-50 px-4 py-2 text-sm font-bold text-ink">
            <Star className="size-4 fill-terracotta-400 text-terracotta-400" aria-hidden="true" />
            {averageRating.toFixed(1)} · {reviews.length} review{reviews.length === 1 ? "" : "s"}
          </span>
        )}
      </div>
      <p className="mt-3 text-sm leading-6 text-sand-700">Guests with a confirmed reservation can publish a review from their check-in date onward.</p>

      {!available ? (
        <p className="mt-6 rounded-2xl border border-terracotta-200 bg-terracotta-50 p-5 text-sm font-semibold text-terracotta-800">Reviews are temporarily unavailable. Please try again shortly.</p>
      ) : (
        <>
          <div className="mt-6 space-y-4">
            {reviews.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-sand-300 bg-sand-50 p-6 text-center">
                <MessageSquare className="mx-auto size-6 text-terracotta-500" aria-hidden="true" />
                <p className="mt-3 font-bold text-ink">No reviews yet.</p>
                <p className="mt-1 text-sm text-sand-600">Your experience can help the next guest choose their stay.</p>
              </div>
            ) : reviews.map((review) => (
              <article key={review.id} className="rounded-2xl border border-sand-200 bg-sand-50 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-terracotta-100 text-sm font-extrabold text-terracotta-700">{review.authorName.trim().slice(0, 1).toUpperCase()}</span>
                    <div className="min-w-0">
                      <p className="font-bold text-ink">{review.authorName}</p>
                      <p className="mt-0.5 text-xs text-sand-600">{new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(review.createdAt))}</p>
                    </div>
                  </div>
                  {(currentUserId === review.authorId || isAdmin) && (
                    <button type="button" onClick={() => remove(review.id)} disabled={removingId !== null} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50">
                      {removingId === review.id ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : <Trash2 className="size-3.5" aria-hidden="true" />} Remove
                    </button>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <span className="flex gap-0.5" aria-label={`${review.rating} out of 5 stars`}>
                    {[1, 2, 3, 4, 5].map((star) => <Star key={star} className={cn("size-4", star <= review.rating ? "fill-terracotta-400 text-terracotta-400" : "text-sand-300")} aria-hidden="true" />)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-olive-700"><BadgeCheck className="size-3.5" aria-hidden="true" /> Verified stay</span>
                </div>
                <p className="mt-3 whitespace-pre-line break-words text-sm leading-7 text-sand-800">{review.comment}</p>
              </article>
            ))}
          </div>

          {currentUserId ? alreadyReviewed ? (
            <p className="mt-6 rounded-2xl bg-olive-50 p-5 text-sm font-semibold text-olive-800">Thank you for sharing your stay. You can remove your review above if needed.</p>
          ) : (
            <form onSubmit={submit} className="mt-7 rounded-3xl border border-sand-200 bg-white p-5 shadow-card sm:p-6">
              <h3 className="font-serif text-2xl font-semibold text-ink">Leave a review</h3>
              <fieldset className="mt-4">
                <legend className="text-sm font-bold text-ink">Your rating</legend>
                <div className="mt-2 flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} type="button" onClick={() => setRating(star)} aria-label={`${star} star${star === 1 ? "" : "s"}`} aria-pressed={rating === star} disabled={isSubmitting} className="rounded-lg p-1.5 transition hover:bg-terracotta-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-majorelle-400">
                      <Star className={cn("size-7", star <= rating ? "fill-terracotta-400 text-terracotta-400" : "text-sand-300")} aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </fieldset>
              <label className="mt-4 block text-sm font-bold text-ink">
                Your experience
                <textarea value={comment} onChange={(event) => setComment(event.target.value)} required maxLength={2_000} rows={4} disabled={isSubmitting} placeholder="What made your stay memorable?" className="mt-2 w-full rounded-2xl border border-sand-300 bg-sand-50 px-4 py-3 text-sm font-medium leading-6 text-ink outline-none transition placeholder:text-sand-500 focus:border-majorelle-400 focus:ring-2 focus:ring-majorelle-100 disabled:opacity-60" />
              </label>
              <div className="mt-4 flex items-center justify-between gap-4">
                <span className="text-xs text-sand-600">{comment.length}/2,000</span>
                <Button type="submit" disabled={isSubmitting || rating === 0 || !comment.trim()}>
                  {isSubmitting && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                  {isSubmitting ? "Publishing…" : "Publish review"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="mt-7 rounded-2xl border border-sand-200 bg-white p-5 text-sm text-sand-700">
              <p>Have a confirmed stay here? Sign in to share a review from your check-in date.</p>
              <Link href={`/api/auth/signin?callbackUrl=${encodeURIComponent(`/properties/${propertyId}#reviews`)}`} className="mt-3 inline-flex rounded-full bg-majorelle-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-majorelle-700">Sign in to review</Link>
            </div>
          )}
        </>
      )}
    </section>
  );
}
