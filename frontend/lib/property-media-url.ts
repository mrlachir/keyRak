const uploadPrefix = "/uploads/property-media/";

/** The backend creates flat filenames; do not accept traversal or private ID paths. */
export function isStoredPropertyMediaPath(value: string): boolean {
  if (!value.startsWith(uploadPrefix)) return false;
  const filename = value.slice(uploadPrefix.length);
  return /^[a-z0-9][a-z0-9._-]*$/i.test(filename) && !filename.includes("..");
}

function publicUploadUrl(path: string, configuredOrigin: string | undefined): string | undefined {
  if (!configuredOrigin?.trim()) return undefined;
  try {
    const origin = new URL(configuredOrigin.trim());
    if (!["http:", "https:"].includes(origin.protocol) || origin.username || origin.password
      || origin.pathname !== "/" || origin.search || origin.hash) return undefined;
    return new URL(path, origin.origin).toString();
  } catch {
    return undefined;
  }
}

/**
 * Shared by browser media components and server metadata. NEXT_PUBLIC_* is a
 * build-time setting: never substitute the private/internal BACKEND_API_URL.
 * Keep external CDN URLs and bundled /properties assets on their own origins.
 */
export function resolvePropertyMediaUrl(
  value: string | null | undefined,
  backendOrigin = process.env.NEXT_PUBLIC_BACKEND_API_URL
    || (process.env.NODE_ENV === "development" ? "http://localhost:8080" : undefined),
): string | undefined {
  const source = value?.trim();
  if (!source || /[\u0000-\u001f\u007f\\]/.test(source)) return undefined;
  if (isStoredPropertyMediaPath(source)) return publicUploadUrl(source, backendOrigin);
  if (source.startsWith("/")) {
    // Bundled frontend assets remain relative. Unknown upload paths are not assets.
    return source.startsWith("//") || source.startsWith("/uploads/") ? undefined : source;
  }
  try {
    const url = new URL(source);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return undefined;
    if (["localhost", "127.0.0.1", "[::1]"].includes(url.hostname.toLowerCase())) {
      // Existing database rows may still contain the old localhost upload origin.
      // Repair only known public upload paths, not arbitrary loopback URLs.
      const publicUrl = isStoredPropertyMediaPath(url.pathname)
        ? publicUploadUrl(url.pathname, backendOrigin) : undefined;
      return publicUrl ? `${publicUrl}${url.search}${url.hash}` : undefined;
    }
    return source;
  } catch {
    return undefined;
  }
}
