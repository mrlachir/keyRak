"use client";

import dynamic from "next/dynamic";
import { CheckCircle2, ImagePlus, LoaderCircle, MapPin, Sparkles, WandSparkles } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";

import {
  createPropertyAction,
  generatePropertyDescriptionAction,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CreatePropertyRequest, PropertyType } from "@/types";

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
  imageUrl: string;
  panoramaUrl: string;
  videoUrl: string;
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
  imageUrl: "",
  panoramaUrl: "",
  videoUrl: "",
};

function numberValue(value: string): number {
  return Number(value.trim());
}

export function AdminPropertyForm() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [amenities, setAmenities] = useState<string[]>([]);
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
    setMessage(null);
    if (!form.title.trim() || amenities.length === 0) {
      const validationMessage = "Add the property title and select at least one amenity first.";
      setMessage(validationMessage);
      toast.error(validationMessage);
      return;
    }
    startGenerating(async () => {
      const result = await generatePropertyDescriptionAction({
        title: form.title,
        propertyType: form.propertyType,
        city: form.city,
        maxGuests: numberValue(form.maxGuests),
        bedrooms: numberValue(form.bedrooms),
        bathrooms: numberValue(form.bathrooms),
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
    if (!form.title.trim() || !form.description.trim() || !form.address.trim() || !form.imageUrl.trim()) {
      const validationMessage = "Title, description, address, and a primary image are required.";
      setMessage(validationMessage);
      toast.error(validationMessage);
      return;
    }
    if (numberValue(form.pricePerNight) <= 0 || numberValue(form.maxGuests) < 1) {
      const validationMessage = "Nightly price and guest capacity must be greater than zero.";
      setMessage(validationMessage);
      toast.error(validationMessage);
      return;
    }

    const media: CreatePropertyRequest["media"] = [
      { url: form.imageUrl.trim(), type: "IMAGE", displayOrder: 0 },
      ...(form.panoramaUrl.trim()
        ? [{ url: form.panoramaUrl.trim(), type: "IMAGE_360" as const, displayOrder: 1 }]
        : []),
      ...(form.videoUrl.trim()
        ? [{ url: form.videoUrl.trim(), type: "VIDEO" as const, displayOrder: 2 }]
        : []),
    ];

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
      active: true,
      tagNames: amenities,
      media,
    };

    startSaving(async () => {
      const result = await createPropertyAction(payload);
      if (!result.ok) {
        setMessage(result.message);
        toast.error(result.message);
        return;
      }
      setCreatedPropertyId(result.data.id);
      setMessage("Property published successfully.");
      toast.success("Property created", {
        description: `${result.data.title} is now live in the marketplace.`,
      });
    });
  };

  return (
    <form onSubmit={submit} className="space-y-8">
      <section className="rounded-3xl border border-sand-200 bg-sand-50 p-5 shadow-card sm:p-7">
        <p className="eyebrow">Property essentials</p>
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
            {amenityOptions.map((amenity) => {
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
            placeholder="Write the property story or generate a first draft from the selected amenities."
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
            <div><p className="eyebrow">Media URLs</p><p className="text-xs text-sand-600">Use durable hosted URLs for production media.</p></div>
          </div>
          <div className="mt-5 space-y-4">
            <label className="block text-sm font-bold text-ink">Primary image<input className={inputClass} value={form.imageUrl} onChange={(event) => update("imageUrl", event.target.value)} maxLength={2048} required placeholder="https://… or /uploads/property.jpg" /></label>
            <label className="block text-sm font-bold text-ink">360° equirectangular image<input className={inputClass} value={form.panoramaUrl} onChange={(event) => update("panoramaUrl", event.target.value)} maxLength={2048} placeholder="https://…/panorama.jpg" /></label>
            <label className="block text-sm font-bold text-ink">Property video<input className={inputClass} value={form.videoUrl} onChange={(event) => update("videoUrl", event.target.value)} maxLength={2048} placeholder="https://…/film.mp4" /></label>
          </div>
        </div>
      </section>

      {message && (
        <div className={cn("rounded-2xl border px-5 py-4 text-sm font-semibold", createdPropertyId ? "border-olive-200 bg-olive-50 text-olive-900" : "border-terracotta-200 bg-terracotta-50 text-terracotta-900")} role="status">
          <div className="flex items-start gap-3">
            {createdPropertyId ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-olive-600" /> : <Sparkles className="mt-0.5 size-5 shrink-0" />}
            <div>
              <p>{message}</p>
              {createdPropertyId && <Link href={`/properties/${createdPropertyId}`} className="mt-2 inline-flex font-bold text-majorelle-700 underline underline-offset-4">View the published property</Link>}
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" className="min-w-48" disabled={isSaving}>
          {isSaving ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {isSaving ? "Publishing…" : "Publish property"}
        </Button>
      </div>
    </form>
  );
}
