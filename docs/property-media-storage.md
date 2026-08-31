# Property media: production URL fix and persistent-storage next steps

## Implemented in this change

- `FileStorageService.store()` now returns only `/uploads/property-media/{generated-filename}`.
  Its deployment-origin configuration has been removed. Public photos, videos and panoramas use the same contract.
- The database keeps that relative reference. External image/video links supplied by an admin remain absolute.
- `PropertyService` and frontend form validation accept retained public upload paths during property edits,
  while rejecting traversal and private ID-document paths. No files need to be re-uploaded just to edit a title.
- `resolvePropertyMediaUrl()` combines upload paths with `NEXT_PUBLIC_BACKEND_API_URL` for the shared
  image component, gallery video/poster, 360 viewer and property metadata. CDN URLs and bundled `/properties/`
  assets are not prefixed. Cards, profile bookings and admin thumbnails use that same image component.
- Old `http://localhost:8080/uploads/property-media/...` references (also IPv4/IPv6 loopback) are resolved
  against the configured public backend at display time. No existing database rows were rewritten.
- Missing/failed photos show a neutral "Image unavailable" graphic, not another property's riad photo.
- `WebConfig` still serves public property media. Government ID storage and its authorization are unchanged.

## Deploy the URL fix

On Vercel, set both variables for the appropriate environment and redeploy:

```dotenv
BACKEND_API_URL=https://keyrak.onrender.com
NEXT_PUBLIC_BACKEND_API_URL=https://keyrak.onrender.com
```

The first is used by server-side API requests. The second is the **browser-reachable origin**, with no `/api`
suffix, credentials, query or fragment. Next.js embeds `NEXT_PUBLIC_*` values at build time; setting only a
runtime environment variable cannot update an already-built browser bundle. Local development can use
`http://localhost:8080`; production does not silently fall back to localhost if the public setting is missing.

Deploy the backend change too. `PUBLIC_API_URL`/`app.storage.public-base-url` no longer control upload URLs.
Keep the exact frontend origin in Render's `CORS_ALLOWED_ORIGINS` so 360 textures can load across origins.

Expected flow:

```text
Database: /uploads/property-media/uuid.jpg
Browser:  https://keyrak.onrender.com/uploads/property-media/uuid.jpg
```

Check an uploaded file's GET response for HTTP 200 and the correct image content type. A URL pointing to an
HTML error/login page is not an image. If the file returns 404 because Render already erased it, changing the
URL cannot recover it: restore it from a backup or upload it again after durable storage is available.

## What is NOT fixed by a relative URL

The service still writes bytes to local disk. Render's default filesystem is ephemeral: local files are lost
on restarts/redeployments, not on a guaranteed time interval. Persistent disks are available for paid services;
only files under the disk's mount point persist. No disk, cloud account, bucket, billing setting or production
database was changed by this implementation. [Render disk documentation](https://render.com/docs/disks)

If choosing a Render disk as an interim measure, mount it at a dedicated path such as `/var/data`, then set:

```dotenv
PROPERTY_MEDIA_STORAGE_DIR=/var/data/property-media
ID_DOCUMENT_STORAGE_DIR=/var/data/id-cards
```

Keep identity documents private; do not add a static resource handler for the ID directory.

## Cloudinary or S3 migration outline — not implemented yet

### 1. Introduce a provider abstraction

Extract validation from `FileStorageService` and inject a provider-neutral storage service into
`PropertyService`. Keep the existing local adapter for development. For example:

```java
public interface PropertyMediaStorage {
    StoredAsset store(MultipartFile file, PropertyMediaType type);
    void delete(StoredAsset asset);
}

public record StoredAsset(
    String provider,       // LOCAL, CLOUDINARY or S3
    String storageKey,     // Cloudinary public_id / S3 object key, not a temporary URL
    String publicPath      // Stable /uploads/property-media/{asset-id} reference
) {}
```

Add nullable `storage_provider` and `storage_key` columns to `property_media` through a reviewed migration.
Backfill LOCAL only for known local uploads; treat arbitrary external links separately. Keep `url` as the stable
relative reference for uploaded assets, preserving the frontend contract. Do not store expiring signed URLs.

### 2. Implement one cloud adapter

**Cloudinary:** add its current supported Java SDK; configure cloud name, API key and API secret on Render
only. Upload photos/panoramas as images and videos with the appropriate resource type. Retain the returned
`public_id` and resource type for deletion and delivery; generate HTTPS delivery URLs on demand. Do not
resize/crop an equirectangular panorama in a way that breaks its 2:1 projection.
[Java image/video upload documentation](https://cloudinary.com/documentation/java_image_and_video_upload)

**S3:** add AWS SDK for Java v2 S3 (and its presigner if using direct uploads). Configure a region, bucket and
least-privilege server credentials. Use application-generated object keys, preserve the verified content type,
and stream the file instead of loading large videos into a Java byte array. Use a private bucket with an
appropriate delivery layer, or generate short-lived authorized download URLs as needed.
[S3 presigned URL documentation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)

### 3. Preserve stable public delivery

For cloud-backed records, replace the local `/uploads/property-media/{asset-id}` resource mapping with a
controller that looks up the stored provider/key and redirects to the appropriate delivery URL. During
migration, retain a LOCAL path for existing files. Do not allow arbitrary URL redirects or key enumeration
to expose private documents. Alternatively, resolve cloud URLs in response DTOs; the frontend already
supports absolute HTTP/HTTPS CDN sources without adding the backend origin again.

Ensure the delivery endpoint/provider supports CORS for 360 textures and byte-range requests for video.
Keep public property media and private government IDs in separate namespaces with separate access rules.

### 4. Bypass Vercel for large upload bodies

The current multipart flow passes through Next.js Server Actions before Spring Boot. Vercel Functions limit
request/response payloads to 4.5 MB; setting a 160 MB Next.js limit does not override that platform limit.
Switching Spring Boot to cloud storage alone will **not** fix large upload requests routed through Vercel.
[Vercel upload limits](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions)

Use a small authenticated request to obtain a short-lived S3 presigned upload URL or Cloudinary upload
signature. The browser uploads bytes directly to storage, then sends the resulting upload identifier to the
backend to finalize property metadata. Backend authorization must validate the admin session, allowed media
type, count/size limits and ownership of the uploaded key before attaching it to a property. Verify the stored
object actually exists and has acceptable metadata; do not trust the browser's completion message alone.
Restrict upload CORS to the frontend origin and keep signing secrets out of `NEXT_PUBLIC_*` values.

### 5. Handle transactions, migration and cleanup

- On rollback, delete only newly uploaded assets owned by that operation; database transactions cannot undo
  cloud writes. Use Spring transaction synchronization plus retryable cleanup for failed provider deletions.
- After a successful edit/delete, remove replaced assets only when no record still references them.
- Copy surviving local files to the provider, verify checksums/content types, then update their provider/key
  mapping. Do not delete original files until verification and database updates succeed.
- Identify missing files explicitly and request re-upload; URLs cannot recreate lost file contents.
- Test upload, playback/360 CORS, unauthorized writes, partial failures, edit/delete cleanup, and availability
  after a backend restart. Add lifecycle cleanup for abandoned signed uploads.

## Local regression checks

```text
cd backend
./mvnw test

cd ../frontend
npm test
npm run lint
npm run typecheck
```

Tests verify relative persisted paths, public file retrieval, retained media on edit, safe cleanup and
frontend component output. They do not modify the hosted Render/Aiven/Vercel services.
