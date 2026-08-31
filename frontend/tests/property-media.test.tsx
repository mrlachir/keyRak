import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { isStoredPropertyMediaPath, resolvePropertyMediaUrl } from "@/lib/property-media-url";
import { validatePropertyMedia } from "@/lib/media-inputs";
import { PropertyImage } from "@/components/property/property-image";
import { PropertyMediaViewer } from "@/components/property/property-media-viewer";
import type { PropertyMedia } from "@/types";

const backend = "https://keyrak.onrender.com";
const upload = "/uploads/property-media/a1b2-cover.jpg";
afterEach(() => { vi.unstubAllEnvs(); });

describe("property media URL resolution", () => {
  it("combines uploaded paths with the public backend origin, normalizing trailing slashes", () => {
    expect(resolvePropertyMediaUrl(upload, backend)).toBe(`${backend}${upload}`);
    expect(resolvePropertyMediaUrl(upload, `${backend}/`)).toBe(`${backend}${upload}`);
    expect(resolvePropertyMediaUrl(` ${upload} `, ` ${backend}/ `)).toBe(`${backend}${upload}`);
  });
  it("uses NEXT_PUBLIC_BACKEND_API_URL, not a private Docker hostname", () => {
    vi.stubEnv("NEXT_PUBLIC_BACKEND_API_URL", backend);
    vi.stubEnv("BACKEND_API_URL", "http://backend:8080");
    expect(resolvePropertyMediaUrl(upload)).toBe(`${backend}${upload}`);
  });
  it.each(["http://localhost:8080", "http://127.0.0.1:8080", "http://[::1]:8080"])("repairs legacy upload origin %s without modifying the database", origin => {
    expect(resolvePropertyMediaUrl(`${origin}${upload}`, backend)).toBe(`${backend}${upload}`);
  });
  it("preserves external CDN URLs, query signatures and bundled frontend assets", () => {
    const cdn = "https://res.cloudinary.com/test/image/upload/v1/cover.jpg?signature=example";
    expect(resolvePropertyMediaUrl(cdn, backend)).toBe(cdn);
    expect(resolvePropertyMediaUrl(`${backend}${upload}`, backend)).toBe(`${backend}${upload}`);
    expect(resolvePropertyMediaUrl("/properties/riad-courtyard.jpg", backend)).toBe("/properties/riad-courtyard.jpg");
  });
  it("does not invent a production localhost backend when configuration is missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_BACKEND_API_URL", "");
    expect(resolvePropertyMediaUrl(upload)).toBeUndefined();
    expect(resolvePropertyMediaUrl(upload, "")).toBeUndefined();
    expect(resolvePropertyMediaUrl(upload, `${backend}/api`)).toBeUndefined();
    expect(resolvePropertyMediaUrl(upload, `${backend}?token=wrong`)).toBeUndefined();
    expect(resolvePropertyMediaUrl(upload, "https://user:password@example.test")).toBeUndefined();
  });
  it.each([undefined, null, "", "javascript:alert(1)", "data:image/svg+xml,bad", "//evil.test/image.jpg",
    "/uploads/id-cards/private.png", "/uploads/property-media/../private.png", "/uploads/property-media/%2e%2e%2fprivate.png",
    "https://user:pass@example.test/image.jpg", "http://localhost:8080/api/users/me", "https://example.test/\\evil.jpg"])("rejects empty, unsafe or private reference %s", source => {
    expect(resolvePropertyMediaUrl(source, backend)).toBeUndefined();
  });
  it("accepts only the flat public upload path contract", () => {
    expect(isStoredPropertyMediaPath(upload)).toBe(true);
    expect(isStoredPropertyMediaPath("/uploads/property-media/subfolder/photo.jpg")).toBe(false);
    expect(isStoredPropertyMediaPath("/uploads/property-media/")).toBe(false);
    expect(isStoredPropertyMediaPath("/uploads/property-media/photo.jpg?path=other")).toBe(false);
  });
});

describe("property media edit validation", () => {
  const noFiles = { IMAGE: [], IMAGE_360: [], VIDEO: [] };
  it("retains uploaded references alongside image, panorama and video links", () => {
    expect(validatePropertyMedia([
      { type: "IMAGE", url: upload, displayOrder: 0 },
      { type: "IMAGE_360", url: "/uploads/property-media/tour.jpg", displayOrder: 1 },
      { type: "VIDEO", url: "https://cdn.example.test/tour.mp4", displayOrder: 2 },
    ], noFiles)).toBeNull();
  });
  it.each(["/uploads/id-cards/private.pdf", "/uploads/property-media/../secret.jpg", "/uploads/property-media/%2e%2e/secret.jpg", "//evil.test/image.jpg"])("rejects invalid saved path %s", url => {
    expect(validatePropertyMedia([{ type: "IMAGE", url, displayOrder: 0 }], noFiles)).not.toBeNull();
  });
});

describe("actual gallery and image component output", () => {
  function media(type: PropertyMedia["type"], url: string, order = 0): PropertyMedia {
    return { id: `test-${order}`, type, url, displayOrder: order, createdAt: "2026-08-31T00:00:00Z" };
  }
  it("renders the uploaded property photo instead of the bundled riad", () => {
    vi.stubEnv("NEXT_PUBLIC_BACKEND_API_URL", backend);
    const html = renderToStaticMarkup(<PropertyMediaViewer title="Uploaded villa" media={[media("IMAGE", upload)]} />);
    expect(html).toContain(`src="${backend}${upload}"`);
    expect(html).not.toContain("riad-courtyard.jpg");
    expect(html).not.toContain("image-unavailable.svg");
  });
  it("resolves gallery thumbnails as well as the primary photo", () => {
    vi.stubEnv("NEXT_PUBLIC_BACKEND_API_URL", backend);
    const second = "/uploads/property-media/second.jpg";
    const html = renderToStaticMarkup(<PropertyMediaViewer title="Villa" media={[media("IMAGE", upload), media("IMAGE", second, 1)]} />);
    expect(html).toContain(`src="${backend}${second}"`);
  });
  it("resolves the native video source", () => {
    vi.stubEnv("NEXT_PUBLIC_BACKEND_API_URL", backend);
    const html = renderToStaticMarkup(<PropertyMediaViewer title="Villa" media={[media("VIDEO", "/uploads/property-media/video.mp4")]} />);
    expect(html).toContain(`src="${backend}/uploads/property-media/video.mp4"`);
  });
  it("uses a neutral fallback only for missing/invalid media", () => {
    const html = renderToStaticMarkup(<PropertyImage alt="Missing photo" src={null} />);
    expect(html).toContain('src="/properties/image-unavailable.svg"');
    expect(html).not.toContain("riad-courtyard.jpg");
  });
});
