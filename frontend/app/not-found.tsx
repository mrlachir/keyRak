import { Compass } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="zellige-overlay grid min-h-[65vh] place-items-center bg-hero-glow px-4 py-16">
      <section className="surface-card w-full max-w-xl rounded-[2rem] p-8 text-center sm:p-10">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-majorelle-100 text-majorelle-700"><Compass className="size-6" aria-hidden="true" /></span>
        <p className="eyebrow mt-6">404 · Lost in the medina</p>
        <h1 className="mt-2 font-serif text-4xl font-semibold text-ink">This place isn’t on the map.</h1>
        <p className="mt-4 text-sm leading-6 text-sand-700">The page may have moved, or the property is no longer available.</p>
        <Link href="/search" className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-majorelle-600 px-6 text-sm font-bold text-white transition hover:bg-majorelle-700">Explore available stays</Link>
      </section>
    </div>
  );
}
