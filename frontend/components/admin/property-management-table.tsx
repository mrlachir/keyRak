"use client";

import { useState } from "react";
import Link from "next/link";
import { LoaderCircle, Pencil, Search, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deletePropertyAction, featurePropertyAction } from "@/app/actions/admin";
import { ViewPropertyLink } from "@/components/admin/view-property-link";
import { PropertyImage } from "@/components/property/property-image";
import { cn, formatPrice } from "@/lib/utils";
import type { Property } from "@/types";

export function PropertyManagementTable({ initialProperties }: { initialProperties: Property[] }) {
  const [properties, setProperties] = useState(initialProperties);
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const featuredCount = properties.filter(property => property.isFeatured).length;
  const visible = properties.filter(property => `${property.title} ${property.city} ${property.address}`.toLowerCase().includes(query.trim().toLowerCase()));

  async function feature(property: Property) {
    if (pending) return;
    setPending(property.id);
    try {
      const result = await featurePropertyAction(property.id, !property.isFeatured);
      if (!result.ok) { toast.error(result.message); return; }
      setProperties(current => current.map(item => item.id === property.id ? result.data : item));
      toast.success(result.data.isFeatured ? "Added to homepage" : "Removed from featured stays");
    } catch { toast.error("The featured selection could not be saved. Please try again."); }
    finally { setPending(null); }
  }

  async function remove(property: Property) {
    if (pending || !window.confirm(`Delete “${property.title}”? This cannot be undone. Properties with reservations must be unpublished instead.`)) return;
    setPending(property.id);
    try {
      const result = await deletePropertyAction(property.id);
      if (!result.ok) { toast.error(result.message); return; }
      setProperties(current => current.filter(item => item.id !== property.id));
      toast.success("Property deleted");
    } catch { toast.error("The property could not be deleted. Please try again."); }
    finally { setPending(null); }
  }

  function featureControl(property: Property) {
    const unavailable = !property.isFeatured && (!property.active || featuredCount >= 3);
    return <button type="button" aria-pressed={property.isFeatured} disabled={pending !== null || unavailable}
      title={!property.active ? "Publish this property first" : unavailable ? "Unfeature another property first (maximum 3)" : undefined}
      onClick={() => feature(property)} className={cn("inline-flex min-h-10 items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50", property.isFeatured ? "border-majorelle-200 bg-majorelle-50 text-majorelle-700" : "border-sand-300 bg-white text-sand-700 hover:border-majorelle-400")}>
      {pending === property.id ? <LoaderCircle className="size-4 animate-spin" /> : <Star className={cn("size-4", property.isFeatured && "fill-majorelle-500")} />}
      {property.isFeatured ? "Featured" : "Feature"}
    </button>;
  }

  function actions(property: Property) {
    return <div className="flex flex-wrap gap-2">
      <ViewPropertyLink property={property} />
      <Link href={`/admin/properties/${property.id}/edit`} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-sand-300 px-3 py-2 text-xs font-bold text-sand-800 hover:bg-sand-100"><Pencil className="size-3.5" /> Edit</Link>
      <button type="button" onClick={() => remove(property)} disabled={pending !== null} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-terracotta-200 px-3 py-2 text-xs font-bold text-terracotta-700 hover:bg-terracotta-50 disabled:opacity-50"><Trash2 className="size-3.5" /> Delete</button>
    </div>;
  }

  function identity(property: Property) {
    return <div className="flex min-w-0 items-center gap-3">
      <PropertyImage src={property.media.find(media => media.type === "IMAGE")?.url} alt="" width={64} height={64} className="size-16 shrink-0 rounded-2xl object-cover" />
      <div className="min-w-0"><Link href={`/admin/properties/${property.id}/edit`} className="break-words font-bold text-ink hover:text-majorelle-700">{property.title}</Link><p className="mt-1 text-xs text-sand-600">{property.city} · {property.propertyType.toLowerCase()}</p></div>
    </div>;
  }

  return <section className="overflow-hidden rounded-[2rem] border border-sand-200 bg-sand-50 shadow-card" aria-label="Property management">
    <header className="flex flex-col justify-between gap-4 border-b border-sand-200 p-5 sm:flex-row sm:items-center sm:p-6">
      <div><p className="font-bold text-ink">{properties.length} properties · {featuredCount}/3 featured</p><p className="mt-1 text-xs leading-5 text-sand-700">Featured stays appear on the homepage. Unpublish booked properties to retain their history.</p></div>
      <label className="flex items-center gap-2 rounded-full border border-sand-300 bg-white px-4 py-2.5"><Search className="size-4 shrink-0 text-sand-600" /><input aria-label="Search properties" value={query} onChange={event => setQuery(event.target.value)} placeholder="Find a property" className="min-w-0 w-full bg-transparent text-sm outline-none" /></label>
    </header>
    <table className="hidden w-full table-fixed text-left lg:table">
      <caption className="sr-only">Properties, publication status, nightly prices, homepage selection, and actions</caption>
      <thead className="bg-sand-100 text-[0.65rem] uppercase tracking-widest text-sand-700"><tr><th className="w-[34%] p-5">Property</th><th className="w-[13%] p-3">Status</th><th className="w-[15%] p-3">Per night</th><th className="w-[16%] p-3">Homepage</th><th className="p-3">Actions</th></tr></thead>
      <tbody className="divide-y divide-sand-200">{visible.map(property => <tr key={property.id} className="hover:bg-white"><td className="p-5">{identity(property)}</td><td className="p-3 text-xs font-bold"><span className={property.active ? "text-olive-700" : "text-sand-600"}>{property.active ? "Published" : "Unpublished"}</span></td><td className="p-3 text-sm font-bold text-ink">{formatPrice(property.pricePerNight)}</td><td className="p-3">{featureControl(property)}</td><td className="p-3">{actions(property)}</td></tr>)}</tbody>
    </table>
    <div className="divide-y divide-sand-200 lg:hidden">{visible.map(property => <article key={property.id} className="space-y-4 p-5">
      {identity(property)}<div className="flex flex-wrap items-center justify-between gap-3 text-sm"><span className="font-bold">{formatPrice(property.pricePerNight)} / night</span><span className={property.active ? "text-olive-700" : "text-sand-600"}>{property.active ? "Published" : "Unpublished"}</span></div>
      <div className="flex flex-wrap items-center justify-between gap-3">{featureControl(property)}{actions(property)}</div>
    </article>)}</div>
    {visible.length === 0 && <p role="status" className="p-10 text-center text-sm text-sand-700">{properties.length ? "No properties match this search." : "No properties yet. Create your first stay to get started."}</p>}
  </section>;
}
