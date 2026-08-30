import Link from "next/link";
import { ArrowRight, Compass, KeyRound, ShieldCheck, Sparkles } from "lucide-react";

import { AiSearchBar } from "@/components/property/ai-search-bar";
import { PropertyCard } from "@/components/property/property-card";
import { apiFetch } from "@/lib/api";
import { toPropertyCardData } from "@/lib/property-presenters";
import type { Property } from "@/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  let featuredProperties: Property[] = [];
  let featuredUnavailable = false;
  try {
    featuredProperties = await apiFetch<Property[]>("/api/properties/featured", { authenticated: false });
  } catch { featuredUnavailable = true; }
  return (
    <>
      <section className="zellige-overlay overflow-hidden bg-hero-glow">
        <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.06fr_.94fr] lg:px-8 lg:py-20">
          <div className="relative z-10 text-center lg:text-left">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-terracotta-200 bg-terracotta-50/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-terracotta-700">
              <Sparkles className="size-4" aria-hidden="true" />
              Search less. Feel at home faster.
            </div>
            <h1 className="text-balance font-serif text-5xl font-semibold leading-[0.96] tracking-[-0.03em] text-ink sm:text-6xl lg:text-8xl">
              Marrakesh,
              <span className="block text-terracotta-600">in your own words.</span>
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-sand-800 sm:text-lg lg:mx-0 lg:max-w-xl">
              Tell us the mood, the people, and the little things that matter. KEYRAK turns your story into a stay worth remembering.
            </p>
            <div className="mt-9 max-w-3xl">
              <AiSearchBar />
            </div>
          </div>

          <div className="relative mx-auto hidden w-full max-w-xl lg:block" aria-label="Curated Marrakesh stays collage">
            <div className="absolute -left-8 top-12 h-[82%] w-[84%] rounded-arch border border-terracotta-200 bg-terracotta-100" />
            <div className="relative ml-auto w-[82%] overflow-hidden rounded-arch shadow-float">
              <div
                className="aspect-[4/5] bg-cover bg-center"
                style={{ backgroundImage: "url('/properties/riad-courtyard.jpg')" }}
                role="img"
                aria-label="A tranquil Marrakesh riad courtyard"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 to-transparent p-7 pt-20 text-white">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-sand-200">Editor’s quiet pick</p>
                <p className="mt-2 font-serif text-3xl font-semibold">Morning light at Riad Noor</p>
                <p className="mt-1 text-sm text-sand-100">Medina · 6 guests · Private courtyard</p>
              </div>
            </div>
            <div className="absolute -bottom-5 -left-2 flex items-center gap-3 rounded-2xl border border-white/70 bg-sand-50/95 p-4 shadow-float backdrop-blur">
              <span className="grid size-11 place-items-center rounded-full bg-olive-100 text-olive-700">
                <ShieldCheck className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-bold text-ink">Locally reviewed</p>
                <p className="text-xs text-sand-700">Every stay tells the truth</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">A thoughtful first look</p>
            <h2 className="mt-3 max-w-xl font-serif text-4xl font-semibold leading-tight text-ink sm:text-5xl">
              Homes with a sense of place.
            </h2>
          </div>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 text-sm font-bold text-majorelle-700 transition hover:gap-3 hover:text-majorelle-800"
          >
            Explore all stays <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featuredProperties.map((property, index) => (
            <PropertyCard key={property.id} property={toPropertyCardData(property)} eager={index === 0} />
          ))}
        </div>
        {featuredProperties.length === 0 && (
          <div className="mt-6 rounded-3xl border border-dashed border-sand-300 bg-sand-50 p-8 text-center">
            <p className="font-serif text-2xl font-semibold text-ink">{featuredUnavailable ? "Our featured stays are temporarily unavailable." : "Our next selection is on its way."}</p>
            <p className="mt-2 text-sm text-sand-700">{featuredUnavailable ? "Please try again shortly, or explore the marketplace." : "Explore all stays while our team curates the homepage."}</p>
            <Link href="/search" className="mt-4 inline-flex rounded-full bg-majorelle-600 px-5 py-3 text-sm font-bold text-white">Browse available stays</Link>
          </div>
        )}
      </section>

      <section id="how-it-works" className="border-y border-sand-200 bg-sand-50">
        <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Naturally simple</p>
            <h2 className="mt-3 font-serif text-4xl font-semibold text-ink sm:text-5xl">From a feeling to a front door.</h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              { icon: Sparkles, step: "01", title: "Describe it", copy: "Write as you would to a friend: quiet, sunny, close to the souks, room for everyone." },
              { icon: Compass, step: "02", title: "Explore the match", copy: "See the best-fit homes alongside their neighborhoods, amenities, and honest availability." },
              { icon: KeyRound, step: "03", title: "Request your stay", copy: "Choose open dates, share the guest details, and keep every trip in one calm place." },
            ].map((item) => (
              <article key={item.step} className="rounded-3xl border border-sand-200 bg-white p-7">
                <div className="flex items-center justify-between">
                  <span className="grid size-12 place-items-center rounded-2xl bg-terracotta-100 text-terracotta-700">
                    <item.icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="font-serif text-2xl font-semibold text-sand-400">{item.step}</span>
                </div>
                <h3 className="mt-7 font-serif text-2xl font-semibold text-ink">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-sand-700">{item.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="hosts" className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2.5rem] bg-majorelle-950 px-6 py-12 text-sand-50 shadow-float sm:px-10 lg:flex lg:items-center lg:justify-between lg:px-14">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-terracotta-300">For Marrakesh hosts</p>
            <h2 className="mt-3 font-serif text-4xl font-semibold sm:text-5xl">A beautiful home deserves a beautiful story.</h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-sand-200">
              Organize media, availability, and guest requests from one considered workspace.
            </p>
          </div>
          <button
            type="button" disabled
            className="mt-8 inline-flex min-h-12 cursor-not-allowed items-center gap-2 rounded-full bg-terracotta-500/60 px-6 text-sm font-bold text-white/80 lg:mt-0"
          >
            Coming soon
          </button>
        </div>
      </section>
    </>
  );
}
