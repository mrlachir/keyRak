import type { CreatePropertyRequest, PropertyMediaType } from "@/types";
import { isStoredPropertyMediaPath } from "@/lib/property-media-url";

export type MediaFiles = Record<PropertyMediaType, File[]>;
export type MediaLinks = NonNullable<CreatePropertyRequest["media"]>;

export const mediaGroups = [
  { type: "IMAGE", part: "images", label: "Property photos", accept: "image/*", limit: 20, hint: "At least one photo. Up to 20 files and links combined, 12 MB per file." },
  { type: "IMAGE_360", part: "panorama", label: "360° equirectangular images", accept: "image/*", limit: 10, hint: "Optional · Up to 10 tours. Use 2:1 panoramas, 12 MB per file." },
  { type: "VIDEO", part: "video", label: "Property videos", accept: "video/*", limit: 10, hint: "Optional · Up to 10 videos, 100 MB per file. Use direct video links, not watch-page URLs." },
] as const;

export function parseMediaLinks(values: Record<PropertyMediaType, string>): MediaLinks {
  return mediaGroups.flatMap(group => [...new Set(values[group.type].split(/\r?\n/).map(url => url.trim()).filter(Boolean))]
    .map((url, displayOrder) => ({ url, type: group.type, displayOrder })));
}

export function validatePropertyMedia(links: MediaLinks, files: MediaFiles): string | null {
  if (!Array.isArray(links) || links.length > 40) return "Use up to 40 media links.";
  for (const media of links) {
    if (!media || typeof media.url !== "string" || !["IMAGE", "IMAGE_360", "VIDEO"].includes(media.type)) return "Choose a valid media type and link.";
    if (isStoredPropertyMediaPath(media.url.trim()) && media.url.length <= 2048) continue;
    try {
      const url = new URL(media.url);
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || media.url.length > 2048) throw new Error();
    } catch { return "Media must be a saved property-media path or a complete HTTP/HTTPS URL without credentials."; }
  }
  if (files.IMAGE.length + links.filter(media => media.type === "IMAGE").length === 0) return "Add at least one property photo as a file or direct link.";
  for (const group of mediaGroups) {
    if (files[group.type].length + links.filter(media => media.type === group.type).length > group.limit) return `${group.label}: use up to ${group.limit} files and links combined.`;
    const maxSize = (group.type === "VIDEO" ? 100 : 12) * 1024 * 1024;
    if (files[group.type].some(file => file.size === 0 || file.size > maxSize || !file.type.startsWith(group.type === "VIDEO" ? "video/" : "image/"))) return `${group.label}: choose valid ${group.accept} files, no larger than ${maxSize / 1024 / 1024} MB each.`;
  }
  if (Object.values(files).flat().reduce((total, file) => total + file.size, 0) > 150 * 1024 * 1024) return "The combined media upload must be 150 MB or smaller.";
  return null;
}
