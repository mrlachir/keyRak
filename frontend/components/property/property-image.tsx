"use client";

/* eslint-disable @next/next/no-img-element */

import { useState, type ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";
import { resolvePropertyMediaUrl } from "@/lib/property-media-url";

const defaultFallback = "/properties/image-unavailable.svg";

type PropertyImageProps = Omit<ComponentPropsWithoutRef<"img">, "src" | "alt" | "onError"> & {
  src?: string | null;
  alt: string;
  fallbackSrc?: string;
  fill?: boolean;
};

/**
 * Keeps property cards and galleries usable when an admin-provided media URL is
 * unavailable. The fallback is a neutral bundled placeholder, so it does not depend
 * on an external host or the image optimizer succeeding for the failed source.
 */
export function PropertyImage({
  src,
  alt,
  fallbackSrc = defaultFallback,
  ...imageProps
}: PropertyImageProps) {
  const resolvedFallback = resolvePropertyMediaUrl(fallbackSrc) ?? defaultFallback;
  const initialSrc = resolvePropertyMediaUrl(src) ?? resolvedFallback;

  return (
    <FallbackablePropertyImage
      key={`${initialSrc}:${resolvedFallback}`}
      initialSrc={initialSrc}
      fallbackSrc={resolvedFallback}
      alt={alt}
      imageProps={imageProps}
    />
  );
}

function FallbackablePropertyImage({
  initialSrc,
  fallbackSrc,
  alt,
  imageProps,
}: {
  initialSrc: string;
  fallbackSrc: string;
  alt: string;
  imageProps: Omit<PropertyImageProps, "src" | "alt" | "fallbackSrc">;
}) {
  const [resolvedSrc, setResolvedSrc] = useState(initialSrc);
  const { fill, className, ...nativeImageProps } = imageProps;

  return (
    <img
      {...nativeImageProps}
      src={resolvedSrc}
      alt={alt}
      className={cn(fill && "absolute inset-0 size-full", className)}
      decoding="async"
      onError={() => {
        if (resolvedSrc !== fallbackSrc) {
          setResolvedSrc(fallbackSrc);
        }
      }}
    />
  );
}
