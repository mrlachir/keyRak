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
        <nav aria-label="Footer navigation" className="grid grid-cols-2 gap-x-10 gap-y-3 text-sm font-semibold text-sand-800">
          <Link href="/search" className="hover:text-majorelle-700">Explore stays</Link>
          <Link href="/about" className="hover:text-majorelle-700">About us</Link>
          <Link href="/wishlist" className="hover:text-majorelle-700">Your wishlist</Link>
          <Link href="/contact" className="hover:text-majorelle-700">Contact & support</Link>
          <Link href="/privacy" className="hover:text-majorelle-700">Privacy</Link>
          <Link href="/terms" className="hover:text-majorelle-700">Terms</Link>
        </nav>
        <p className="text-xs text-sand-700 md:col-span-2">
          © {new Date().getFullYear()} KEYRAK. Crafted in Marrakesh.
        </p>
      </div>
    </footer>
  );
}
