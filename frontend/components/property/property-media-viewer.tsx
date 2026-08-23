"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Images, Play, Rotate3D } from "lucide-react";
import { useMemo, useState } from "react";

import { PanoramaViewer } from "@/components/property/panorama-viewer";
import { cn } from "@/lib/utils";
import type { PropertyMedia } from "@/types";

type MediaMode = "photos" | "360" | "video";

const mediaModes: Array<{ id: MediaMode; label: string; icon: typeof Images }> = [
  { id: "photos", label: "Photos", icon: Images },
  { id: "360", label: "360°", icon: Rotate3D },
  { id: "video", label: "Video", icon: Play },
];

export function PropertyMediaViewer({ media, title }: { media: PropertyMedia[]; title: string }) {
  const sortedMedia = useMemo(
    () => [...media].sort((left, right) => left.displayOrder - right.displayOrder),
    [media],
  );
  const photos = sortedMedia.filter((item) => item.type === "IMAGE");
  const panorama = sortedMedia.find((item) => item.type === "IMAGE_360");
  const video = sortedMedia.find((item) => item.type === "VIDEO");
  const [activeMode, setActiveMode] = useState<MediaMode>(photos.length ? "photos" : panorama ? "360" : "video");
  const [photoIndex, setPhotoIndex] = useState(0);
  const currentPhoto = photos[photoIndex];
  const poster = photos[0]?.url;

  const modeAvailable = (mode: MediaMode) => {
    if (mode === "photos") return photos.length > 0;
    if (mode === "360") return Boolean(panorama);
    return Boolean(video);
  };

  return (
    <section aria-label="Property media viewer">
      <div className="mb-4 flex w-fit gap-1 rounded-full border border-sand-200 bg-sand-50 p-1 shadow-sm" role="tablist">
        {mediaModes.map((mode) => {
          const Icon = mode.icon;
          const available = modeAvailable(mode.id);
          return (
            <button
              key={mode.id}
              type="button"
              role="tab"
              aria-selected={activeMode === mode.id}
              aria-controls={`property-media-${mode.id}`}
              disabled={!available}
              onClick={() => available && setActiveMode(mode.id)}
              className={cn(
                "inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-majorelle-500 disabled:cursor-not-allowed disabled:opacity-35",
                activeMode === mode.id
                  ? "bg-majorelle-600 text-white shadow-sm"
                  : "text-sand-700 hover:bg-sand-100 hover:text-ink",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {mode.label}
            </button>
          );
        })}
      </div>

      <div className="relative aspect-[16/10] min-h-[22rem] overflow-hidden rounded-arch bg-sand-200 shadow-card">
        {activeMode === "photos" && currentPhoto && (
          <div id="property-media-photos" role="tabpanel" className="absolute inset-0">
            <Image
              src={currentPhoto.url}
              alt={`${title}, photo ${photoIndex + 1} of ${photos.length}`}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 66vw"
              className="object-cover"
            />
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setPhotoIndex((photoIndex - 1 + photos.length) % photos.length)}
                  className="absolute left-4 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-sand-50/90 text-ink shadow-lg backdrop-blur transition hover:bg-white"
                  aria-label="Previous property photo"
                >
                  <ChevronLeft className="size-5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoIndex((photoIndex + 1) % photos.length)}
                  className="absolute right-4 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-sand-50/90 text-ink shadow-lg backdrop-blur transition hover:bg-white"
                  aria-label="Next property photo"
                >
                  <ChevronRight className="size-5" aria-hidden="true" />
                </button>
                <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2 rounded-full bg-ink/45 px-3 py-2 backdrop-blur">
                  {photos.map((photo, index) => (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => setPhotoIndex(index)}
                      className={cn("size-2 rounded-full", index === photoIndex ? "bg-white" : "bg-white/45")}
                      aria-label={`Show property photo ${index + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {activeMode === "360" && panorama && (
          <div id="property-media-360" role="tabpanel" className="absolute inset-0">
            <PanoramaViewer src={panorama.url} title={title} />
          </div>
        )}

        {activeMode === "video" && video && (
          <div id="property-media-video" role="tabpanel" className="absolute inset-0 bg-ink">
            <video
              src={video.url}
              poster={poster}
              controls
              playsInline
              preload="metadata"
              className="size-full object-contain"
              aria-label={`${title} property video`}
            />
          </div>
        )}
      </div>
    </section>
  );
}
