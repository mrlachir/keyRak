# KEYRAK Marketplace

KEYRAK is a Java 17 Spring Boot and Next.js real-estate marketplace with Google SSO, HS256 API tokens, Groq-powered
semantic search, interactive booking availability, immersive property media, and administrator/client portals.

## Production-style container stack

1. Copy `.env.example` to `.env` and replace every credential placeholder.
2. Register `${NEXTAUTH_URL}/api/auth/callback/google` in the Google OAuth application.
3. Start the complete stack:

```text
docker compose up --build -d
```

The frontend is published on port `3000` and the backend on port `8080` by default. MySQL is available only on
the private Compose network and persists data in the `mysql_data` named volume.

Compose creates secrets from the host environment and grants each service only the values it needs. The shared
`JWT_SECRET` is mounted into both application containers; database and Groq credentials are never written into
an image. The database healthcheck gates backend startup, and the backend healthcheck gates frontend startup.

Useful operations:

```text
docker compose ps
docker compose logs -f backend frontend
docker compose down
```

`docker compose down` keeps MySQL data. Removing the named volume is intentionally a separate, destructive
operation.

## Phase 3: property media and verified reviews

The admin property studio accepts a mix of uploaded files and direct HTTP(S) links for up to 20 photos,
10 equirectangular 360° images, and 10 videos. Images are limited to 12 MB each and videos to 100 MB each.
The combined upload limit is 150 MB. JPEG, PNG, WebP,
GIF, and AVIF images and MP4, WebM, MOV, and M4V videos are supported; browser codec support may vary.
The first linked photo is the cover when present; otherwise the first uploaded photo is used. The details
gallery advances every two seconds, with previous/next, thumbnail navigation, and a pause control. Manual
navigation restarts the timer. Arrows appear on hover or keyboard focus and stay available on touch devices.
Separate selectors let guests choose among all 360° tours and videos.

`POST /api/properties` requires an admin token and `multipart/form-data` with these parts:

- `property`: property details as `application/json` (a JSON Blob in the Next.js server action).
- `images`: repeat this part for each photo.
- `panorama`: repeat this optional part for each 360° image.
- `video`: repeat this optional part for each property video.

The JSON details can also include `media` entries with `type` (`IMAGE`, `IMAGE_360`, or `VIDEO`),
`url`, and `displayOrder`. At least one standard image is required, uploaded or linked. The browser form
offers multiple file inputs and one-link-per-line text areas for each media type, forwarding both in the
same authenticated multipart request. External media servers must permit browser access (and CORS for
360° textures); video links must point to playable media, not a video-sharing website's page.

Description generation sends the current title, property type, city, address, room counts, nightly price,
guest capacity, and amenities as JSON to Groq. The prompt uses supplied facts without inventing amenities
or defaulting every property to Marrakesh.

Public files are saved under `backend/uploads/property-media` for a local backend, or
`/app/uploads/property-media` in Docker, and served at
`http://localhost:8080/uploads/property-media/{filename}`. Docker persists these in the existing
`booking_uploads` volume. Government IDs remain in a separate, non-public `uploads/id-cards` directory.
Failed property creation cleans up newly stored media.

Government IDs belong to user profiles. `PUT /api/users/me/id-card` accepts an authenticated multipart
`idCard` file (image or PDF, at most 8 MB). The profile page can upload or replace it; checkout reuses the
saved document and allows an optional replacement. IDs are not publicly served, and “on file” does not
mean identity verification has taken place. A startup migration copies each user's latest legacy booking
ID reference into an empty profile ID field, without overwriting existing profile IDs or dropping the old
booking column. Replacements remove the previous file only after the database transaction commits.

Set `BACKEND_PUBLIC_URL` in the root `.env` to the browser-accessible backend origin for deployment
(for example, `https://api.example.com`). Compose maps it to `PUBLIC_API_URL`; when running Java directly,
set `PUBLIC_API_URL` and optionally `PROPERTY_MEDIA_STORAGE_DIR`. Do not use the internal Docker hostname
for public media URLs. Configure any reverse proxy to accept at least 160 MB request bodies as well.

Review endpoints:

- `GET /api/properties/{id}/reviews`: public review list.
- `POST /api/properties/{id}/reviews`: authenticated JSON `{ "rating": 5, "comment": "..." }`.
- `DELETE /api/reviews/{id}`: author or administrator only.

Creation requires a `CONFIRMED` booking belonging to that user and property whose check-in date is
today or earlier. Ratings must be 1–5 and comments 1–2,000 characters. One review per guest/property
is enforced in the database. Ineligible submissions return HTTP 403; duplicates return HTTP 409.
Hibernate's existing `ddl-auto=update` creates the review table when the backend starts.

The reservation review queue has All, Booking Requests, and Cancellation Requests tabs, with live counts.
The latter two show pending reservations and confirmed reservations requesting cancellation respectively.

Verification:

```text
cd backend
.\mvnw.cmd -q test
cd ../frontend
npm run lint
npm run typecheck
```
