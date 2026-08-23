import Link from "next/link";

import { Logo } from "@/components/ui/logo";

export function Footer() {
  return (
    <footer className="border-t border-sand-200 bg-sand-50">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_auto] lg:px-8">
        <div>
          <Logo />
          <p className="mt-4 max-w-md text-sm leading-6 text-sand-800">
            Thoughtful stays, local character, and a simpler way to find your place in Marrakesh.
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-x-8 gap-y-3 text-sm font-semibold text-sand-800">
          <Link href="/search" className="hover:text-majorelle-700">Explore</Link>
          <Link href="/#hosts" className="hover:text-majorelle-700">List a property</Link>
          <Link href="/#support" className="hover:text-majorelle-700">Support</Link>
        </div>
        <p className="text-xs text-sand-700 md:col-span-2">
          © {new Date().getFullYear()} KEYRAK. Crafted in Marrakesh.
        </p>
      </div>
    </footer>
  );
}
