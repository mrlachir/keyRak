import { BarChart3, Building2, CalendarCheck2, Home, PlusCircle, UsersRound } from "lucide-react";
import Link from "next/link";

import { requireAdminSession } from "@/lib/access";

const adminLinks = [
  { href: "/admin/dashboard", label: "Overview", icon: BarChart3 },
  { href: "/admin/bookings", label: "Reservations", icon: CalendarCheck2 },
  { href: "/admin/properties", label: "Properties", icon: Building2 },
  { href: "/admin/users", label: "Users", icon: UsersRound },
  { href: "/admin/properties/new", label: "New property", icon: PlusCircle },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminSession("/admin/dashboard");

  return (
    <div className="min-h-full bg-sand-100">
      <div className="border-b border-sand-200 bg-ink text-sand-100">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-2 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="mr-3 inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-bold text-sand-300 transition hover:bg-white/10 hover:text-white">
            <Home className="size-4" aria-hidden="true" /> Marketplace
          </Link>
          {adminLinks.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-bold text-sand-200 transition hover:bg-white/10 hover:text-white">
              <Icon className="size-4 text-terracotta-300" aria-hidden="true" /> {label}
            </Link>
          ))}
        </div>
      </div>
      {children}
    </div>
  );
}
