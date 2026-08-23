import Link from "next/link";

import { AuthButton } from "@/components/layout/auth-button";
import { Logo } from "@/components/ui/logo";

const navItems = [
  { href: "/search", label: "Explore stays" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#hosts", label: "For hosts" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-sand-200/80 bg-sand-100/90 backdrop-blur-xl">
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-7 md:flex" aria-label="Primary navigation">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-semibold text-sand-800 transition hover:text-majorelle-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-majorelle-500 focus-visible:ring-offset-4"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <AuthButton />
      </div>
    </header>
  );
}
