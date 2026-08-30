import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPropertyForm } from "@/components/admin/admin-property-form";
import { getAdminProperty } from "@/lib/management";
import { ApiError } from "@/lib/api";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit property" };

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let property;
  try { property = await getAdminProperty(id); }
  catch (error) { if (error instanceof ApiError && error.status === 404) notFound(); throw error; }
  return <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
    <Link href="/admin/properties" className="text-sm font-bold text-majorelle-700">← Back to properties</Link>
    <p className="eyebrow mt-8">Property studio</p><h1 className="mt-3 font-serif text-4xl font-semibold text-ink sm:text-5xl">Edit {property.title}</h1>
    <p className="mt-4 text-sm leading-6 text-sand-700">Existing media links are prefilled. Keep them to retain your gallery, or replace them with new links and files. Price changes apply to new bookings only.</p>
    <div className="mt-9"><AdminPropertyForm property={property} /></div>
  </div>;
}
