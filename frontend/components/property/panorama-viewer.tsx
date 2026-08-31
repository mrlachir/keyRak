"use client";

import { LoaderCircle, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { resolvePropertyMediaUrl } from "@/lib/property-media-url";

export function PanoramaViewer({ src, title }: { src: string; title: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let disposed = false;
    let viewer: import("@photo-sphere-viewer/core").Viewer | undefined;

    import("@photo-sphere-viewer/core")
      .then(({ Viewer }) => {
        if (disposed || !container.current) return;
        const panoramaUrl = resolvePropertyMediaUrl(src);
        if (!panoramaUrl) throw new Error("The panorama URL or public backend origin is invalid.");
        viewer = new Viewer({
          container: container.current,
          panorama: panoramaUrl,
          caption: `${title} · 360° tour`,
          navbar: ["zoom", "fullscreen"],
          touchmoveTwoFingers: true,
          mousewheelCtrlKey: true,
          defaultZoomLvl: 35,
        });
        viewer.addEventListener("ready", () => !disposed && setStatus("ready"), { once: true });
        viewer.addEventListener("panorama-error", () => !disposed && setStatus("error"));
      })
      .catch(() => !disposed && setStatus("error"));

    return () => {
      disposed = true;
      viewer?.destroy();
    };
  }, [src, title]);

  return (
    <div className="relative h-full min-h-64 w-full bg-ink sm:min-h-[22rem]" role="region" aria-label={`${title} interactive 360 degree tour`}>
      <div ref={container} className="absolute inset-0" />
      {status === "loading" && (
        <div className="absolute inset-0 grid place-items-center bg-ink text-sand-100">
          <div className="text-center">
            <LoaderCircle className="mx-auto size-7 animate-spin text-terracotta-300" aria-hidden="true" />
            <p className="mt-3 text-sm font-bold">Loading the immersive tour…</p>
          </div>
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 grid place-items-center bg-ink p-8 text-center text-sand-100" role="alert">
          <div>
            <TriangleAlert className="mx-auto size-7 text-terracotta-300" aria-hidden="true" />
            <p className="mt-3 font-serif text-2xl font-semibold">The 360° image could not be loaded.</p>
            <p className="mt-2 text-sm text-sand-300">Check that the media URL points to an equirectangular panorama.</p>
          </div>
        </div>
      )}
    </div>
  );
}
