"use client";

import { ChevronLeft, ChevronRight, Images, ImageOff, Pause, Play, Rotate3D } from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { PanoramaViewer } from "@/components/property/panorama-viewer";
import { PropertyImage } from "@/components/property/property-image";
import { cn } from "@/lib/utils";
import { resolvePropertyMediaUrl } from "@/lib/property-media-url";
import type { PropertyMedia } from "@/types";

type MediaMode = "photos" | "360" | "video";

const mediaModes: Array<{ id: MediaMode; label: string; icon: typeof Images }> = [
  { id: "photos", label: "Photos", icon: Images },
  { id: "360", label: "360°", icon: Rotate3D },
  { id: "video", label: "Video", icon: Play },
];

function subscribeToMotionPreference(onChange: () => void) {
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  preference.addEventListener("change", onChange);
  return () => preference.removeEventListener("change", onChange);
}

const getMotionPreference = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const getServerMotionPreference = () => true;

export function PropertyMediaViewer({ media, title }: { media: PropertyMedia[]; title: string }) {
  const sortedMedia = useMemo(
    () => [...media].sort((left, right) => left.displayOrder - right.displayOrder),
    [media],
  );
  const photos = sortedMedia.filter((item) => item.type === "IMAGE");
  const panoramas = sortedMedia.filter((item) => item.type === "IMAGE_360");
  const videos = sortedMedia.filter((item) => item.type === "VIDEO");
  const [panoramaIndex, setPanoramaIndex] = useState(0);
  const [videoIndex, setVideoIndex] = useState(0);
  const panorama = panoramas[panoramaIndex] ?? panoramas[0];
  const video = videos[videoIndex] ?? videos[0];
  const [activeMode, setActiveMode] = useState<MediaMode>(photos.length ? "photos" : panorama ? "360" : video ? "video" : "photos");
  const [photoIndex, setPhotoIndex] = useState(0);
  const [timerVersion, setTimerVersion] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const reduceMotion = useSyncExternalStore(subscribeToMotionPreference, getMotionPreference, getServerMotionPreference);
  const currentPhoto = photos[photoIndex] ?? photos[0];
  const poster = resolvePropertyMediaUrl(photos[0]?.url);
  const activeItems = activeMode === "photos" ? photos : activeMode === "360" ? panoramas : videos;
  const activeIndex = activeMode === "photos" ? photoIndex : activeMode === "360" ? panoramaIndex : videoIndex;
  const itemLabel = activeMode === "photos" ? "photo" : activeMode === "360" ? "360 tour" : "video";

  useEffect(() => {
    if (activeMode !== "photos" || photos.length < 2 || !autoPlay || hovered || focused || reduceMotion) return;
    const interval = window.setInterval(() => {
      setPhotoIndex((current) => (current + 1) % photos.length);
    }, 2_000);
    return () => window.clearInterval(interval);
  }, [activeMode, photos.length, autoPlay, hovered, focused, reduceMotion, timerVersion]);

  const showPhoto = (index: number) => {
    if (!photos.length) return;
    setPhotoIndex((index + photos.length) % photos.length);
    setTimerVersion((current) => current + 1);
  };

  const navigateMedia = (direction: -1 | 1) => {
    if (activeItems.length < 2) return;
    if (activeMode === "photos") showPhoto(photoIndex + direction);
    else if (activeMode === "360") setPanoramaIndex(current => (current + direction + panoramas.length) % panoramas.length);
    else setVideoIndex(current => (current + direction + videos.length) % videos.length);
  };

  const modeAvailable = (mode: MediaMode) => {
    if (mode === "photos") return photos.length > 0;
    if (mode === "360") return Boolean(panorama);
    return Boolean(video);
  };

  return (
    <section aria-label="Property media viewer">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-fit gap-1 rounded-full border border-sand-200 bg-sand-50 p-1 shadow-sm" role="tablist" aria-label="Media type">
          {mediaModes.map((mode) => {
            const Icon = mode.icon;
            const available = modeAvailable(mode.id);
            return (
              <button
                key={mode.id}
                type="button"
                role="tab"
                id={`property-media-tab-${mode.id}`}
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
        {activeMode === "photos" && photos.length > 1 && !reduceMotion && (
          <button
            type="button"
            onClick={() => setAutoPlay(current => !current)}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-sand-700 transition hover:text-majorelle-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-majorelle-500"
            aria-label={autoPlay ? "Pause photo slideshow" : "Play photo slideshow"}
          >
            {autoPlay ? <Pause className="size-3.5" aria-hidden="true" /> : <Play className="size-3.5" aria-hidden="true" />}
            {autoPlay ? "Pause slideshow" : "Play slideshow"}
          </button>
        )}
      </div>

      <div
        className="group relative isolate aspect-[16/10] min-h-64 w-full overflow-hidden rounded-arch bg-sand-200 shadow-card sm:min-h-[22rem]"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
      >
        {activeMode === "photos" && currentPhoto && (
          <div id="property-media-photos" role="tabpanel" aria-labelledby="property-media-tab-photos" className="absolute inset-0 z-0">
            <PropertyImage
              src={currentPhoto.url}
              alt={`${title}, photo ${photoIndex + 1} of ${photos.length}`}
              fill
              loading="eager"
              sizes="(max-width: 1024px) 100vw, 66vw"
              className="object-cover"
            />
          </div>
        )}

        {activeMode === "photos" && !currentPhoto && (
          <div id="property-media-photos" role="tabpanel" aria-labelledby="property-media-tab-photos" className="absolute inset-0 z-0 grid place-items-center bg-ink p-8 text-center text-sand-100">
            <div>
              <ImageOff className="mx-auto size-8 text-terracotta-300" aria-hidden="true" />
              <p className="mt-3 font-serif text-2xl font-semibold">Property photos are being prepared.</p>
              <p className="mt-2 text-sm text-sand-300">Please check back shortly for the full gallery.</p>
            </div>
          </div>
        )}

        {activeMode === "360" && panorama && (
          <div id="property-media-360" role="tabpanel" aria-labelledby="property-media-tab-360" className="absolute inset-0 z-0">
            <PanoramaViewer key={panorama.id} src={panorama.url} title={`${title} · Tour ${panoramaIndex + 1}`} />
          </div>
        )}

        {activeMode === "video" && video && (
          <div id="property-media-video" role="tabpanel" aria-labelledby="property-media-tab-video" className="absolute inset-0 z-0 bg-ink">
            <video
              key={video.id}
              src={resolvePropertyMediaUrl(video.url)}
              poster={poster}
              controls
              playsInline
              preload="metadata"
              className="size-full object-contain"
              aria-label={`${title} property video ${videoIndex + 1}`}
            />
          </div>
        )}
        {activeItems.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => navigateMedia(-1)}
              className="absolute left-3 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-sand-50/90 text-ink shadow-lg backdrop-blur opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-majorelle-500 sm:left-4"
              aria-label={`Previous property ${itemLabel}`}
              aria-controls={`property-media-${activeMode}`}
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => navigateMedia(1)}
              className="absolute right-3 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-sand-50/90 text-ink shadow-lg backdrop-blur opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-majorelle-500 sm:right-4"
              aria-label={`Next property ${itemLabel}`}
              aria-controls={`property-media-${activeMode}`}
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </>
        )}
      </div>
      <p className="sr-only" aria-live={activeMode === "photos" && autoPlay ? "off" : "polite"} aria-atomic="true">
        {activeItems.length > 0 ? `${itemLabel} ${activeIndex + 1} of ${activeItems.length}` : "No property media available"}
      </p>

      {activeMode !== "photos" && activeItems.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={activeMode === "360" ? "360° image selection" : "Video selection"}>
          {activeItems.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={index === activeIndex}
              aria-controls={`property-media-${activeMode}`}
              onClick={() => activeMode === "360" ? setPanoramaIndex(index) : setVideoIndex(index)}
              className={cn(
                "inline-flex min-h-10 items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-majorelle-500 focus-visible:ring-offset-2",
                index === activeIndex
                  ? "border-majorelle-600 bg-majorelle-600 text-white shadow-sm"
                  : "border-sand-300 bg-sand-50 text-sand-700 hover:border-majorelle-300 hover:bg-majorelle-50 hover:text-majorelle-700",
              )}
            >
              {activeMode === "360" ? <Rotate3D className="size-3.5" aria-hidden="true" /> : <Play className="size-3.5" aria-hidden="true" />}
              {activeMode === "360" ? "Image" : "Video"} {index + 1}
            </button>
          ))}
        </div>
      )}

      {activeMode === "photos" && photos.length > 1 && (
        <div className="hide-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1" aria-label="Property photo thumbnails">
          {photos.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => showPhoto(index)}
              className={cn(
                "relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-majorelle-500",
                index === photoIndex ? "border-majorelle-600" : "border-transparent opacity-70 hover:opacity-100",
              )}
              aria-label={`Show property photo ${index + 1}`}
              aria-current={index === photoIndex ? "true" : undefined}
            >
              <PropertyImage
                src={photo.url}
                alt=""
                fill
                sizes="96px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
