"use client";

import { ChevronLeft, ChevronRight, Images, ImageOff, Pause, Play, Rotate3D } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PanoramaViewer } from "@/components/property/panorama-viewer";
import { PropertyImage } from "@/components/property/property-image";
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
  const currentPhoto = photos[photoIndex] ?? photos[0];
  const poster = photos[0]?.url;

  useEffect(() => {
    if (activeMode !== "photos" || photos.length < 2 || !autoPlay) return;
    const interval = window.setInterval(() => {
      setPhotoIndex((current) => (current + 1) % photos.length);
    }, 2_000);
    return () => window.clearInterval(interval);
  }, [activeMode, photos.length, autoPlay, timerVersion]);

  const showPhoto = (index: number) => {
    setPhotoIndex((index + photos.length) % photos.length);
    setTimerVersion((current) => current + 1);
  };

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

      <div className="group relative aspect-[16/10] min-h-64 w-full overflow-hidden rounded-arch bg-sand-200 shadow-card sm:min-h-[22rem]">
        {activeMode === "photos" && currentPhoto && (
          <div id="property-media-photos" role="tabpanel" className="absolute inset-0">
            <PropertyImage
              src={currentPhoto.url}
              alt={`${title}, photo ${photoIndex + 1} of ${photos.length}`}
              fill
              loading="eager"
              sizes="(max-width: 1024px) 100vw, 66vw"
              className="object-cover"
            />
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => showPhoto(photoIndex - 1)}
                  className="absolute left-4 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-sand-50/90 text-ink shadow-lg backdrop-blur opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 hover:bg-white focus-visible:ring-2 focus-visible:ring-majorelle-500"
                  aria-label="Previous property photo"
                >
                  <ChevronLeft className="size-5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => showPhoto(photoIndex + 1)}
                  className="absolute right-4 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-sand-50/90 text-ink shadow-lg backdrop-blur opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 hover:bg-white focus-visible:ring-2 focus-visible:ring-majorelle-500"
                  aria-label="Next property photo"
                >
                  <ChevronRight className="size-5" aria-hidden="true" />
                </button>
                <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full bg-ink/55 px-3 py-2 text-xs font-bold text-white backdrop-blur">
                  <span>{photoIndex + 1} / {photos.length}</span>
                  <button
                    type="button"
                    onClick={() => setAutoPlay((current) => !current)}
                    className="grid size-6 place-items-center rounded-full transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    aria-label={autoPlay ? "Pause photo slideshow" : "Play photo slideshow"}
                  >
                    {autoPlay ? <Pause className="size-3.5" aria-hidden="true" /> : <Play className="size-3.5" aria-hidden="true" />}
                  </button>
                  <span className={cn("gap-1.5", photos.length <= 8 ? "flex" : "hidden")} aria-label="Choose a property photo">
                    {photos.map((photo, index) => (
                      <button
                        key={photo.id}
                        type="button"
                        onClick={() => showPhoto(index)}
                        className={cn("size-2.5 rounded-full ring-1 ring-white/30 transition", index === photoIndex ? "scale-110 bg-white" : "bg-white/45 hover:bg-white/75")}
                        aria-label={`Show property photo ${index + 1}`}
                        aria-current={index === photoIndex ? "true" : undefined}
                      />
                    ))}
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {activeMode === "photos" && !currentPhoto && (
          <div id="property-media-photos" role="tabpanel" className="absolute inset-0 grid place-items-center bg-ink p-8 text-center text-sand-100">
            <div>
              <ImageOff className="mx-auto size-8 text-terracotta-300" aria-hidden="true" />
              <p className="mt-3 font-serif text-2xl font-semibold">Property photos are being prepared.</p>
              <p className="mt-2 text-sm text-sand-300">Please check back shortly for the full gallery.</p>
            </div>
          </div>
        )}

        {activeMode === "360" && panorama && (
          <div id="property-media-360" role="tabpanel" className="absolute inset-0">
            <PanoramaViewer key={panorama.id} src={panorama.url} title={`${title} · Tour ${panoramaIndex + 1}`} />
          </div>
        )}

        {activeMode === "video" && video && (
          <div id="property-media-video" role="tabpanel" className="absolute inset-0 bg-ink">
            <video
              key={video.id}
              src={video.url}
              poster={poster}
              controls
              playsInline
              preload="metadata"
              className="size-full object-contain"
              aria-label={`${title} property video ${videoIndex + 1}`}
            />
          </div>
        )}
      </div>

      {activeMode !== "photos" && (
        <div className="mt-3 flex flex-wrap gap-2" aria-label={activeMode === "360" ? "Choose a 360 tour" : "Choose a property video"}>
          {(activeMode === "360" ? panoramas : videos).map((item, index) => (
            <button key={item.id} type="button" aria-pressed={index === (activeMode === "360" ? panoramaIndex : videoIndex)}
              onClick={() => activeMode === "360" ? setPanoramaIndex(index) : setVideoIndex(index)}
              className={cn("inline-flex min-h-10 items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition", index === (activeMode === "360" ? panoramaIndex : videoIndex) ? "border-majorelle-600 bg-majorelle-600 text-white" : "border-sand-300 bg-sand-50 text-sand-800 hover:border-majorelle-400")}>
              {activeMode === "360" ? <Rotate3D className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
              {activeMode === "360" ? "360° tour" : "Video"} {index + 1}
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
