"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowRight, LoaderCircle } from "lucide-react";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { signInErrorMessage } from "@/lib/sign-in";

export function GoogleSignIn({ callbackUrl, initialError }: { callbackUrl: string; initialError: string | null }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(initialError);
  const submitting = useRef(false);

  // Restore the control when returning from Google with the browser's Back button.
  useEffect(() => {
    const reset = () => { submitting.current = false; setPending(false); };
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  async function continueWithGoogle() {
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    setError(null);
    try {
      // NextAuth handles CSRF, OAuth state and the existing Google callback route.
      const response = await signIn("google", { callbackUrl });
      if (response?.error) throw new Error("Sign-in failed");
    } catch {
      setError(signInErrorMessage("OAuthSignin"));
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-terracotta-200 bg-terracotta-50 p-4 text-sm leading-6 text-terracotta-800">
          <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}
      <Button
        onClick={continueWithGoogle}
        disabled={pending}
        aria-busy={pending}
        className="min-h-14 w-full justify-between gap-3 px-5 sm:min-h-16 sm:px-6"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white">
          <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
            <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.3 2.98-7.36Z" />
            <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.23-2.51c-.9.6-2.04.96-3.39.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z" />
            <path fill="#FBBC05" d="M6.41 13.92a6 6 0 0 1 0-3.84V7.49H3.07a10 10 0 0 0 0 9.02l3.34-2.59Z" />
            <path fill="#EA4335" d="M12 5.96c1.47 0 2.79.5 3.82 1.49l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.49l3.34 2.59C7.2 7.72 9.4 5.96 12 5.96Z" />
          </svg>
        </span>
        <span aria-live="polite">{pending ? "Connecting to Google…" : "Continue with Google"}</span>
        {pending ? <LoaderCircle className="size-5 shrink-0 animate-spin" aria-hidden="true" /> : <ArrowRight className="size-5 shrink-0" aria-hidden="true" />}
      </Button>
    </div>
  );
}
