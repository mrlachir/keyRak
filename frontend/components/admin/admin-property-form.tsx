"use client";

import dynamic from "next/dynamic";
import { CheckCircle2, ImagePlus, LoaderCircle, MapPin, Sparkles, WandSparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";

import {
  createPropertyAction,
  updatePropertyAction,
  generatePropertyDescriptionAction,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { PropertyMediaInput } from "@/components/admin/property-media-input";
import { ViewPropertyLink } from "@/components/admin/view-property-link";
import { mediaGroups, parseMediaLinks, validatePropertyMedia, type MediaFiles } from "@/lib/media-inputs";
import { cn } from "@/lib/utils";
import type { CreatePropertyRequest, Property, PropertyMediaType, PropertyType } from "@/types";

const PropertyLocationMap = dynamic(
  () => import("@/components/admin/property-location-map"),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-72 place-items-center rounded-2xl bg-olive-50 text-sm font-bold text-olive-800">
        <LoaderCircle className="mr-2 inline size-5 animate-spin" aria-hidden="true" /> Loading location map…
      </div>
    ),
  },
);

const amenityOptions = [
  "Private pool",
  "Wi-Fi",
  "Rooftop",
  "Garden",
  "Air conditioning",
  "Workspace",
  "Breakfast",
  "Parking",
  "Mountain view",
  "Hammam",
];

const inputClass =
  "mt-2 min-h-12 w-full rounded-2xl border border-sand-300 bg-white px-4 text-sm font-medium text-ink outline-none transition placeholder:text-sand-500 focus:border-majorelle-400 focus:ring-2 focus:ring-majorelle-100";

interface FormState {
  title: string;
  description: string;
  propertyType: PropertyType;
  address: string;
  city: string;
  pricePerNight: string;
  latitude: string;
  longitude: string;
  maxGuests: string;
  bedrooms: string;
  bathrooms: string;
}

const initialForm: FormState = {
  title: "",
  description: "",
  propertyType: "VILLA",
  address: "",
  city: "Marrakesh",
  pricePerNight: "",
  latitude: "31.6295",
  longitude: "-7.9811",
  maxGuests: "2",
  bedrooms: "1",
  bathrooms: "1",
};

function numberValue(value: string): number {
  return Number(value.trim());
}

export function AdminPropertyForm({ property }: { property?: Property }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => property ? {
    title: property.title, description: property.description ?? "", propertyType: property.propertyType,
    address: property.address, city: property.city, pricePerNight: String(property.pricePerNight),
    latitude: String(property.latitude), longitude: String(property.longitude), maxGuests: String(property.maxGuests),
    bedrooms: String(property.bedrooms), bathrooms: String(property.bathrooms),
  } : initialForm);
  const [active, setActive] = useState(property?.active ?? true);
  const [amenities, setAmenities] = useState<string[]>(property?.tags.map(tag => tag.name) ?? []);
  const [mediaFiles, setMediaFiles] = useState<MediaFiles>({ IMAGE: [], IMAGE_360: [], VIDEO: [] });
  const [mediaUrls, setMediaUrls] = useState<Record<PropertyMediaType, string>>(() => ({
    IMAGE: property?.media.filter(media => media.type === "IMAGE").map(media => media.url).join("\n") ?? "",
    IMAGE_360: property?.media.filter(media => media.type === "IMAGE_360").map(media => media.url).join("\n") ?? "",
    VIDEO: property?.media.filter(media => media.type === "VIDEO").map(media => media.url).join("\n") ?? "",
  }));
  const [message, setMessage] = useState<string | null>(null);
  const [createdPropertyId, setCreatedPropertyId] = useState<string | null>(null);
  const [isGenerating, startGenerating] = useTransition();
  const [isSaving, startSaving] = useTransition();

  const update = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const toggleAmenity = (amenity: string) => {
    setAmenities((current) =>
      current.includes(amenity)
        ? current.filter((item) => item !== amenity)
        : [...current, amenity],
    );
  };

  const updateCoordinates = (latitude: number, longitude: number) => {
    update("latitude", latitude.toFixed(7));
    update("longitude", longitude.toFixed(7));
  };

  const generateDescription = () => {
    if (isGenerating || isSaving) return;
    setMessage(null);
    if (!form.title.trim() || !form.city.trim()) {
      const validationMessage = "Add the property title and city first. Any other completed fields will inform the description.";
      setMessage(validationMessage);
      toast.error(validationMessage);
      return;
    }
    startGenerating(async () => {
      const result = await generatePropertyDescriptionAction({
        title: form.title,
        propertyType: form.propertyType,
        city: form.city,
        address: form.address.trim() || null,
        pricePerNight: form.pricePerNight.trim() ? numberValue(form.pricePerNight) : null,
        maxGuests: form.maxGuests.trim() ? numberValue(form.maxGuests) : null,
        bedrooms: form.bedrooms.trim() ? numberValue(form.bedrooms) : null,
        bathrooms: form.bathrooms.trim() ? numberValue(form.bathrooms) : null,
        amenities,
      });
      if (!result.ok) {
        setMessage(result.message);
        toast.error(result.message);
        return;
      }
      update("description", result.data.description);
      setMessage("AI copy generated. Review it for accuracy before publishing.");
      toast.success("AI description generated", {
        description: "Review the copy for accuracy before publishing.",
      });
    });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;
    setMessage(null);
    setCreatedPropertyId(null);

    const numericValues = [
      form.pricePerNight,
      form.latitude,
      form.longitude,
      form.maxGuests,
      form.bedrooms,
      form.bathrooms,
    ].map(numberValue);
    if (numericValues.some((value) => !Number.isFinite(value))) {
      const validationMessage = "Complete every numeric property field with a valid number.";
      setMessage(validationMessage);
      toast.error(validationMessage);
      return;
    }
    if (!form.title.trim() || !form.description.trim() || !form.address.trim()) {
      const validationMessage = "Title, description, and address are required.";
      setMessage(validationMessage);
      toast.error(validationMessage);
      return;
    }
    const linkedMedia = parseMediaLinks(mediaUrls);
    const mediaError = validatePropertyMedia(linkedMedia, mediaFiles);
    if (mediaError) {
      setMessage(mediaError);
      toast.error(mediaError);
      return;
    }
    if (numberValue(form.pricePerNight) <= 0 || numberValue(form.maxGuests) < 1) {
      const validationMessage = "Nightly price and guest capacity must be greater than zero.";
      setMessage(validationMessage);
      toast.error(validationMessage);
      return;
    }

    const payload: CreatePropertyRequest = {
      title: form.title.trim(),
      description: form.description.trim(),
      propertyType: form.propertyType,
      address: form.address.trim(),
      city: form.city.trim(),
      pricePerNight: numberValue(form.pricePerNight),
      latitude: numberValue(form.latitude),
      longitude: numberValue(form.longitude),
      maxGuests: numberValue(form.maxGuests),
      bedrooms: numberValue(form.bedrooms),
      bathrooms: numberValue(form.bathrooms),
      active,
      tagNames: amenities,
      media: linkedMedia,
    };

    startSaving(async () => {
      const formData = new FormData();
      formData.set("property", JSON.stringify(payload));
      for (const group of mediaGroups) {
        mediaFiles[group.type].forEach(file => formData.append(group.part, file, file.name));
      }
      const result = property ? await updatePropertyAction(property.id, formData) : await createPropertyAction(formData);
      if (!result.ok) {
        setMessage(result.message);
        toast.error(result.message);
        return;
      }
      setCreatedPropertyId(result.data.id);
      setMessage(property ? "Property updated successfully." : "Property saved successfully.");
      toast.success(property ? "Property updated" : "Property created", {
        description: result.data.active ? `${result.data.title} is live in the marketplace.` : "This property is unpublished and hidden from search.",
        action: result.data.active ? {
          label: "View property",
          onClick: () => router.push(`/properties/${result.data.id}`),
        } : undefined,
      });
      router.push("/admin/properties");
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="space-y-8">
      <section className="rounded-3xl border border-sand-200 bg-sand-50 p-5 shadow-card sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="eyebrow">Property essentials</p>
          {property && <ViewPropertyLink property={property} />}
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-bold text-ink sm:col-span-2">
            Property title
            <input className={inputClass} value={form.title} onChange={(event) => update("title", event.target.value)} maxLength={180} required placeholder="Villa Azur Atlas" />
          </label>
          <label className="text-sm font-bold text-ink">
            Property type
            <select className={inputClass} value={form.propertyType} onChange={(event) => update("propertyType", event.target.value as PropertyType)}>
              <option value="VILLA">Villa</option>
              <option value="APARTMENT">Apartment</option>
              <option value="HOUSE">House / Riad</option>
            </select>
          </label>
          <label className="text-sm font-bold text-ink">
            City
            <input className={inputClass} value={form.city} onChange={(event) => update("city", event.target.value)} maxLength={100} required />
          </label>
          <label className="text-sm font-bold text-ink sm:col-span-2">
            Address
            <input className={inputClass} value={form.address} onChange={(event) => update("address", event.target.value)} maxLength={255} required placeholder="Route de l’Ourika, Km 8" />
          </label>
          <label className="text-sm font-bold text-ink">
            Latitude
            <input className={inputClass} type="number" step="0.0000001" min="-90" max="90" value={form.latitude} onChange={(event) => update("latitude", event.target.value)} required />
          </label>
          <label className="text-sm font-bold text-ink">
            Longitude
            <input className={inputClass} type="number" step="0.0000001" min="-180" max="180" value={form.longitude} onChange={(event) => update("longitude", event.target.value)} required />
          </label>
          <div className="sm:col-span-2">
            <div className="flex items-center gap-2 text-sm font-bold text-ink">
              <MapPin className="size-4 text-terracotta-600" aria-hidden="true" />
              Drop the property pin
            </div>
            <p className="mt-1 text-xs leading-5 text-sand-600">Click anywhere on the map to fill the latitude and longitude fields.</p>
            <div className="mt-3 overflow-hidden rounded-2xl border border-sand-200">
              <PropertyLocationMap
                latitude={numberValue(form.latitude)}
                longitude={numberValue(form.longitude)}
                onCoordinatesChange={updateCoordinates}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-sand-200 bg-sand-50 p-5 shadow-card sm:p-7">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <p className="eyebrow">Amenities & AI copywriter</p>
            <h2 className="mt-2 font-serif text-3xl font-semibold text-ink">Turn facts into a truthful story.</h2>
          </div>
          <Button type="button" variant="secondary" onClick={generateDescription} disabled={isGenerating}>
            {isGenerating ? <LoaderCircle className="size-4 animate-spin" /> : <WandSparkles className="size-4" />}
            {isGenerating ? "Génération…" : "Générer la description (IA)"}
          </Button>
        </div>
        <fieldset className="mt-6">
          <legend className="text-sm font-bold text-ink">Select only amenities that are present</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {[...new Set([...amenityOptions, ...amenities])].map((amenity) => {
              const selected = amenities.includes(amenity);
              return (
                <button
                  key={amenity}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleAmenity(amenity)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-xs font-bold transition",
                    selected
                      ? "border-olive-600 bg-olive-600 text-white"
                      : "border-sand-300 bg-white text-sand-800 hover:border-olive-400",
                  )}
                >
                  {amenity}
                </button>
              );
            })}
          </div>
        </fieldset>
        <label className="mt-6 block text-sm font-bold text-ink">
          Description
          <textarea
            className={`${inputClass} min-h-48 py-4 leading-7`}
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
            maxLength={10_000}
            required
            placeholder="Write the property story or generate a first draft from all the property details above and below."
          />
        </label>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-3xl border border-sand-200 bg-sand-50 p-5 shadow-card sm:p-7">
          <p className="eyebrow">Capacity & price</p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-bold text-ink sm:col-span-2">Price per night (MAD)<input className={inputClass} type="number" min="1" step="0.01" value={form.pricePerNight} onChange={(event) => update("pricePerNight", event.target.value)} required /></label>
            <label className="text-sm font-bold text-ink">Maximum guests<input className={inputClass} type="number" min="1" max="100" value={form.maxGuests} onChange={(event) => update("maxGuests", event.target.value)} required /></label>
            <label className="text-sm font-bold text-ink">Bedrooms<input className={inputClass} type="number" min="0" max="100" value={form.bedrooms} onChange={(event) => update("bedrooms", event.target.value)} required /></label>
            <label className="text-sm font-bold text-ink">Bathrooms<input className={inputClass} type="number" min="0" max="100" value={form.bathrooms} onChange={(event) => update("bathrooms", event.target.value)} required /></label>
          </div>
        </div>

        <div className="rounded-3xl border border-sand-200 bg-sand-50 p-5 shadow-card sm:p-7">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-terracotta-100 text-terracotta-700"><ImagePlus className="size-5" /></span>
            <div><p className="eyebrow">Property media</p><p className="text-xs text-sand-600">Upload files, paste links, or combine both.</p></div>
          </div>
          <div className="mt-5 space-y-4">
            {mediaGroups.map(group => (
              <PropertyMediaInput key={group.type} label={group.label} hint={group.hint} accept={group.accept}
                files={mediaFiles[group.type]} urls={mediaUrls[group.type]} disabled={isSaving}
                onFilesChange={files => setMediaFiles(current => ({ ...current, [group.type]: files }))}
                onUrlsChange={urls => setMediaUrls(current => ({ ...current, [group.type]: urls }))} />
            ))}
            <p className="text-xs leading-5 text-sand-600">The first linked photo is the cover when links are provided; otherwise the first uploaded photo is used. External media must allow public access and cross-origin loading for 360° tours.</p>
            <p className="text-xs leading-5 text-sand-600">Combined limit: 150 MB. Property media is public once published; do not upload private documents here.</p>
          </div>
        </div>
      </section>

      {message && (
        <div className={cn("rounded-2xl border px-5 py-4 text-sm font-semibold", createdPropertyId ? "border-olive-200 bg-olive-50 text-olive-900" : "border-terracotta-200 bg-terracotta-50 text-terracotta-900")} role="status">
          <div className="flex items-start gap-3">
            {createdPropertyId ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-olive-600" /> : <Sparkles className="mt-0.5 size-5 shrink-0" />}
            <div>
              <p>{message}</p>
              {createdPropertyId && <Link href={active ? `/properties/${createdPropertyId}` : "/admin/properties"} className="mt-2 inline-flex font-bold text-majorelle-700 underline underline-offset-4">{active ? "View the published property" : "Back to property management"}</Link>}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <label className="flex items-start gap-3 text-sm font-bold text-ink">
          <input type="checkbox" checked={active} onChange={event => setActive(event.target.checked)} disabled={isSaving} className="mt-1 size-4 accent-majorelle-600" />
          <span>Published<span className="mt-1 block max-w-md text-xs font-medium leading-5 text-sand-700">Unpublishing hides the property from search and featured stays. Existing reservations are preserved.</span></span>
        </label>
        <Button type="submit" className="min-w-48" disabled={isSaving}>
          {isSaving ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {isSaving ? "Saving…" : property ? "Save changes" : "Create property"}
        </Button>
      </div>
    </form>
  );
}
