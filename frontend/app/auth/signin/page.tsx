import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Heart, KeyRound, MapPin } from "lucide-react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { GoogleSignIn } from "@/components/auth/google-sign-in";
import { authOptions } from "@/lib/auth";
import { signInErrorMessage, signInReturnPath } from "@/lib/sign-in";

export const metadata: Metadata = {
  title: "Welcome to KEYRAK",
  description: "Sign in to save your favorite stays and manage your Marrakesh trips.",
  robots: { index: false, follow: false },
};

export default async function SignInPage({ searchParams }: {
  searchParams: Promise<{ callbackUrl?: string | string[]; error?: string | string[] }>;
}) {
  const params = await searchParams;
  const callbackUrl = signInReturnPath(params.callbackUrl, process.env.NEXTAUTH_URL);
  const error = signInErrorMessage(params.error);
  const session = await getServerSession(authOptions);
  if (session?.user && !error) redirect(callbackUrl);

  return (
    <section aria-labelledby="sign-in-heading" className="zellige-overlay overflow-hidden">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <Link href="/search" className="inline-flex min-h-10 items-center gap-2 rounded-lg text-sm font-semibold text-sand-800 transition hover:text-majorelle-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-majorelle-500">
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to exploring
        </Link>

        <div className="grid items-center gap-12 pb-8 pt-6 sm:pb-12 lg:grid-cols-2 lg:gap-20 lg:pt-8">
          <div className="relative hidden px-5 pb-5 lg:block">
            <div aria-hidden="true" className="absolute bottom-0 left-0 right-10 top-5 rounded-arch border border-terracotta-200 bg-terracotta-100/70" />
            <div className="relative isolate overflow-hidden rounded-arch bg-sand-200 shadow-card">
              <Image
                src="/properties/riad-courtyard.jpg"
                alt="Sunlit arches and a peaceful courtyard in Marrakesh"
                width={900}
                height={1100}
                sizes="(min-width: 1024px) 44vw, 1px"
                preload
                className="aspect-[4/5] w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-8 text-sand-50 xl:p-10">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-sand-200">
                  <MapPin className="size-4" aria-hidden="true" /> Marrakesh, Morocco
                </p>
                <p className="mt-4 max-w-xs font-serif text-4xl font-medium leading-[1.05] xl:text-5xl">A place to stay.<br />A feeling to keep.</p>
                <p className="mt-4 max-w-xs text-sm leading-6 text-sand-100">Quiet courtyards, warm welcomes, and a stay that feels like you.</p>
              </div>
            </div>
          </div>

          <div className="mx-auto w-full max-w-md">
            <div className="mb-7 grid size-14 place-items-center rounded-t-full rounded-b-2xl border border-terracotta-200 bg-terracotta-100 text-terracotta-700">
              <KeyRound className="size-6" strokeWidth={1.5} aria-hidden="true" />
            </div>
            <p className="eyebrow">Make yourself at home</p>
            <h1 id="sign-in-heading" className="mt-4 font-serif text-5xl font-semibold leading-[1.02] tracking-tight text-ink sm:text-6xl">
              Welcome to{" "}<span className="block text-terracotta-600">KEYRAK.</span>
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-7 text-sand-800 sm:text-base">Your favorite homes and next adventures, all in one place. Sign in to pick up where you left off.</p>

            <div className="mt-8 rounded-3xl border border-sand-200 bg-sand-50/95 p-5 shadow-card sm:p-7">
              <GoogleSignIn callbackUrl={callbackUrl} initialError={error} />
              <p className="mt-4 text-center text-xs leading-6 text-sand-800">New here? The same button creates your account.<br />No extra password to remember.</p>
              <div className="mt-6 border-t border-sand-200 pt-5 text-center text-xs leading-6 text-sand-700">
                Read our <Link href="/terms" className="font-semibold text-sand-900 underline decoration-sand-300 underline-offset-4 hover:text-majorelle-700">Terms</Link> and <Link href="/privacy" className="font-semibold text-sand-900 underline decoration-sand-300 underline-offset-4 hover:text-majorelle-700">Privacy Policy</Link>.
              </div>
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs font-semibold text-sand-800">
              <span className="inline-flex items-center gap-2"><Heart className="size-4 text-terracotta-600" aria-hidden="true" /> Save your favorites</span>
              <span className="inline-flex items-center gap-2"><CalendarDays className="size-4 text-olive-600" aria-hidden="true" /> Keep your trips together</span>
            </div>
            <p className="mt-6 text-center text-xs text-sand-700">Need a hand? <Link href="/contact" className="font-bold text-majorelle-700 underline-offset-4 hover:underline">Contact us</Link></p>
          </div>
        </div>
      </div>
    </section>
  );
}
