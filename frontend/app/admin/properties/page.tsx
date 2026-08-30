import Link from "next/link";
import { Plus } from "lucide-react";
import { getAdminProperties } from "@/lib/management";
import { PropertyManagementTable } from "@/components/admin/property-management-table";

export const dynamic = "force-dynamic";
export const metadata = { title: "Manage properties" };

export default async function AdminPropertiesPage() {
  const properties = await getAdminProperties();
  return <div className="mx-auto w-full max-w-[1500px] px-4 py-12 sm:px-6 lg:px-8">
    <div className="mb-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="eyebrow">Your property collection</p><h1 className="mt-3 font-serif text-4xl font-semibold text-ink sm:text-5xl">Manage every stay.</h1><p className="mt-4 max-w-xl text-sm leading-6 text-sand-700">Edit your listings, manage publication, and select up to three homes for the homepage.</p></div>
      <Link href="/admin/properties/new" className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full bg-majorelle-600 px-5 text-sm font-bold text-white"><Plus className="size-4" /> New property</Link></div>
    <PropertyManagementTable initialProperties={properties} />
  </div>;
}
