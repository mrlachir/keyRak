"use client";

import { CircleAlert, LoaderCircle, LogOut, Phone, UserRound } from "lucide-react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";

import { updateProfileAction } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";

export function OnboardingModal({
  initialFullName = "",
  initialTelephone = "",
  verificationError = false,
}: {
  initialFullName?: string;
  initialTelephone?: string;
  verificationError?: boolean;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialFullName);
  const [telephone, setTelephone] = useState(initialTelephone);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [completed, setCompleted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  if (completed) return null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;
    setFieldErrors({});

    startTransition(async () => {
      const result = await updateProfileAction({ fullName, telephone });
      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        toast.error(result.message);
        return;
      }
      toast.success("Your profile is ready.");
      setCompleted(true);
      router.refresh();
    });
  }

  async function handleSignOut() {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await signOut({ callbackUrl: "/" });
    } catch {
      setIsSigningOut(false);
      toast.error("Sign-out could not be completed.");
    }
  }

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center overflow-y-auto bg-ink/75 p-4 backdrop-blur-md">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        aria-describedby="onboarding-description"
        className="zellige-overlay relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/70 bg-sand-50 p-6 shadow-float sm:p-8"
      >
        <p className="eyebrow">One last detail</p>
        <h2 id="onboarding-title" className="mt-3 font-serif text-4xl font-semibold leading-none text-ink">
          Complete your guest profile.
        </h2>
        <p id="onboarding-description" className="mt-4 text-sm leading-6 text-sand-700">
          Your host needs a name and telephone number before you can explore stays or request a reservation.
        </p>

        {verificationError ? (
          <div className="mt-7">
            <div className="rounded-2xl border border-terracotta-200 bg-terracotta-50 p-4 text-sm leading-6 text-terracotta-900" role="alert">
              <CircleAlert className="mb-2 size-5" aria-hidden="true" />
              We could not verify your profile with the booking service. Check that the backend is available, then retry.
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button type="button" className="flex-1" onClick={() => router.refresh()}>
                Retry verification
              </Button>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border border-sand-300 bg-sand-50 px-5 text-sm font-bold text-sand-800 transition hover:border-terracotta-300 hover:text-terracotta-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSigningOut ? <LoaderCircle className="size-4 animate-spin" /> : <LogOut className="size-4" />}
                Sign out
              </button>
            </div>
          </div>
        ) : (
          <form className="mt-7 space-y-5" onSubmit={handleSubmit} noValidate>
            <label className="block text-sm font-bold text-ink">
              Full name
              <span className="relative mt-2 block">
                <UserRound className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-sand-600" aria-hidden="true" />
                <input
                  autoFocus
                  required
                  maxLength={150}
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="min-h-12 w-full rounded-2xl border border-sand-300 bg-white pl-11 pr-4 text-sm text-ink outline-none transition placeholder:text-sand-500 focus:border-majorelle-500 focus:ring-4 focus:ring-majorelle-100"
                  aria-invalid={Boolean(fieldErrors.fullName)}
                  aria-describedby={fieldErrors.fullName ? "onboarding-name-error" : undefined}
                />
              </span>
              {fieldErrors.fullName && <span id="onboarding-name-error" className="mt-1 block text-xs text-terracotta-700">{fieldErrors.fullName}</span>}
            </label>

            <label className="block text-sm font-bold text-ink">
              Telephone
              <span className="relative mt-2 block">
                <Phone className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-sand-600" aria-hidden="true" />
                <input
                  required
                  type="tel"
                  maxLength={32}
                  autoComplete="tel"
                  placeholder="+212 6 00 00 00 00"
                  value={telephone}
                  onChange={(event) => setTelephone(event.target.value)}
                  className="min-h-12 w-full rounded-2xl border border-sand-300 bg-white pl-11 pr-4 text-sm text-ink outline-none transition placeholder:text-sand-500 focus:border-majorelle-500 focus:ring-4 focus:ring-majorelle-100"
                  aria-invalid={Boolean(fieldErrors.telephone)}
                  aria-describedby={fieldErrors.telephone ? "onboarding-phone-error" : undefined}
                />
              </span>
              {fieldErrors.telephone && <span id="onboarding-phone-error" className="mt-1 block text-xs text-terracotta-700">{fieldErrors.telephone}</span>}
            </label>

            <Button type="submit" disabled={isPending} className="w-full">
              {isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
              {isPending ? "Saving profile…" : "Save and continue"}
            </Button>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut || isPending}
              className="mx-auto flex items-center gap-2 text-xs font-bold text-sand-600 transition hover:text-terracotta-700 disabled:opacity-60"
            >
              {isSigningOut ? <LoaderCircle className="size-3.5 animate-spin" /> : <LogOut className="size-3.5" />}
              Use a different account
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
