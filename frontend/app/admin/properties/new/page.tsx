import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AdminPropertyForm } from "@/components/admin/admin-property-form";
import { requireAdminSession } from "@/lib/access";

export const metadata: Metadata = {
  title: "New property",
  description: "Create a KEYRAK property with immersive media and AI-assisted copy.",
};

export default async function NewPropertyPage() {
  await requireAdminSession("/admin/properties/new");

  return (
    <div className="bg-sand-100">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-sand-700 transition hover:text-majorelle-700">
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to marketplace
        </Link>
        <div className="mt-7 max-w-3xl">
          <p className="eyebrow">Admin property studio</p>
          <h1 className="mt-3 font-serif text-5xl font-semibold leading-none text-ink sm:text-6xl">Create a stay worth discovering.</h1>
          <p className="mt-5 text-base leading-7 text-sand-700">
            Define the facts, attach each media mode, and let Groq prepare a polished first draft from the amenities you select.
          </p>
        </div>
        <div className="mt-10"><AdminPropertyForm /></div>
      </div>
    </div>
  );
}
