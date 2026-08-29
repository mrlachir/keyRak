"use client";

import { LoaderCircle, Phone, Save, UserRound } from "lucide-react";
import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";

import { updateProfileAction } from "@/app/actions/profile";
import type { UserProfileResponse } from "@/types";

export function ProfileEditor({ profile }: { profile: UserProfileResponse }) {
  const [fullName, setFullName] = useState(profile.displayName ?? "");
  const [telephone, setTelephone] = useState(profile.telephone ?? "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

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
      setFullName(result.data.displayName ?? "");
      setTelephone(result.data.telephone ?? "");
      toast.success("Profile updated.");
    });
  }

  return (
    <section className="surface-card mt-9 rounded-[2rem] p-6 sm:p-7" aria-labelledby="profile-details-title">
      <div className="max-w-2xl">
        <p className="eyebrow">Contact details</p>
        <h2 id="profile-details-title" className="mt-2 font-serif text-3xl font-semibold text-ink">Your guest profile</h2>
        <p className="mt-2 text-sm leading-6 text-sand-700">Keep these details current so hosts can reach you about a reservation.</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-5 md:grid-cols-[1fr_1fr_auto] md:items-start" noValidate>
        <label className="text-sm font-bold text-ink">
          Full name
          <span className="relative mt-2 block">
            <UserRound className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-sand-600" aria-hidden="true" />
            <input
              required
              maxLength={150}
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="min-h-12 w-full rounded-2xl border border-sand-300 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-majorelle-500 focus:ring-4 focus:ring-majorelle-100"
              aria-invalid={Boolean(fieldErrors.fullName)}
            />
          </span>
          {fieldErrors.fullName && <span className="mt-1 block text-xs text-terracotta-700">{fieldErrors.fullName}</span>}
        </label>

        <label className="text-sm font-bold text-ink">
          Telephone
          <span className="relative mt-2 block">
            <Phone className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-sand-600" aria-hidden="true" />
            <input
              required
              type="tel"
              maxLength={32}
              autoComplete="tel"
              value={telephone}
              onChange={(event) => setTelephone(event.target.value)}
              className="min-h-12 w-full rounded-2xl border border-sand-300 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-majorelle-500 focus:ring-4 focus:ring-majorelle-100"
              aria-invalid={Boolean(fieldErrors.telephone)}
            />
          </span>
          {fieldErrors.telephone && <span className="mt-1 block text-xs text-terracotta-700">{fieldErrors.telephone}</span>}
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-majorelle-600 px-6 text-sm font-bold text-white transition hover:bg-majorelle-700 disabled:cursor-not-allowed disabled:opacity-60 md:min-w-36"
        >
          {isPending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
          {isPending ? "Saving…" : "Save profile"}
        </button>
      </form>
    </section>
  );
}
