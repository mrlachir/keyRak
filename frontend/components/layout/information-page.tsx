import Link from "next/link";

import { cn } from "@/lib/utils";

const pages = [
  { href: "/about", label: "About us" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export function InformationPage({ path, eyebrow, title, intro, children }: {
  path: string;
  eyebrow: string;
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <header className="mb-9 border-b border-sand-200 pb-8">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-3 max-w-3xl text-balance font-serif text-4xl font-semibold leading-tight sm:text-6xl">{title}</h1>
        <p className="mt-5 max-w-2xl text-base leading-8 text-sand-800">{intro}</p>
        <nav aria-label="About KEYRAK" className="mt-7 flex flex-wrap gap-2">
          {pages.map((page) => <Link key={page.href} href={page.href} aria-current={path === page.href ? "page" : undefined}
            className={cn("inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-majorelle-500 focus-visible:ring-offset-2", path === page.href ? "border-majorelle-600 bg-majorelle-600 text-white" : "border-sand-300 bg-sand-50 text-sand-800 hover:border-majorelle-300 hover:text-majorelle-700")}>{page.label}</Link>)}
        </nav>
      </header>
      <div className="space-y-5">{children}</div>
    </div>
  );
}

export function InformationSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-3xl border border-sand-200 bg-sand-50 p-6 sm:p-8">
    <h2 className="font-serif text-2xl font-semibold text-ink sm:text-3xl">{title}</h2>
    <div className="mt-3 space-y-3 text-sm leading-7 text-sand-800 [&_a]:font-semibold [&_a]:text-majorelle-700 [&_a]:underline [&_a]:underline-offset-4">{children}</div>
  </section>;
}
