"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    toast.error("This view could not be loaded", {
      description: "The service may be temporarily unavailable.",
    });
  }, [error]);

  return (
    <div className="zellige-overlay grid min-h-[65vh] place-items-center bg-hero-glow px-4 py-16">
      <section className="surface-card w-full max-w-xl rounded-[2rem] p-8 text-center sm:p-10">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-terracotta-100 text-terracotta-700"><TriangleAlert className="size-6" aria-hidden="true" /></span>
        <p className="eyebrow mt-6">A brief interruption</p>
        <h1 className="mt-2 font-serif text-4xl font-semibold text-ink">We couldn’t prepare this view.</h1>
        <p className="mt-4 text-sm leading-6 text-sand-700">Your information is safe. Retry the request, or return to the marketplace while the service recovers.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button onClick={reset}><RotateCcw className="size-4" aria-hidden="true" /> Try again</Button>
          <Link href="/" className="inline-flex min-h-11 items-center justify-center rounded-full border border-sand-300 bg-sand-50 px-5 text-sm font-bold text-ink transition hover:border-terracotta-300">Back home</Link>
        </div>
      </section>
    </div>
  );
}
