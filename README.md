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

Uploaded media is stored in the database as `/uploads/property-media/{filename}`, with no origin.
Set `NEXT_PUBLIC_BACKEND_API_URL` before building the frontend (`https://keyrak.onrender.com` in production,
`http://localhost:8080` locally). Compose passes it as a build argument. Keep `BACKEND_API_URL` for server-side
API requests; never use an internal Docker hostname as the public media origin. `PUBLIC_API_URL` is no longer
used by the upload service. Java's optional `PROPERTY_MEDIA_STORAGE_DIR` controls the physical file location.
Vercel's upload payload limit still applies even though the application allows larger multipart bodies.
See [media delivery and persistent-storage migration](docs/property-media-storage.md) before deploying uploads.

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

## Phase 4: administration and featured stays

- `/admin/properties`: full inventory, publication status, edit/delete controls, and homepage selection.
- `/admin/properties/{id}/edit`: edit facts and media through the existing multipart studio.
- `/admin/users`: read-only account directory (names, email, telephone, role; no identity-document paths).
- `/admin/bookings`: all reservations with full details; Booking Requests and Cancellation Requests tabs
  retain the moderation workflow. Decisions update the entry in the register instead of erasing its history.
- `/admin/dashboard`: active inventory, pending requests, completed-payment revenue, and confirmed
  pay-on-arrival value.

`Property.isFeatured` defaults to false. Admin-only `PATCH /api/properties/{id}/featured` accepts
`{"isFeatured":true}`. A database row lock serializes selection, enforcing the maximum of three across
concurrent API instances. Unpublished properties cannot be featured; unpublishing removes the feature flag.
The public `GET /api/properties/featured` endpoint supplies the homepage without demo-listing fallback.
Until an admin chooses properties, the homepage shows an empty selection with a link to browse all stays.
The homepage's host CTA is a disabled “Coming soon” button.

Admin inventory reads use `GET /api/admin/properties` and `GET /api/admin/properties/{id}`. Updates use
`PUT /api/properties/{id}` with the same JSON and file parts as creation. Keep existing media URLs in the
JSON to retain them; uploaded files are appended. Removing a media entry or deleting an unused property
does not erase physical uploaded files, since links can be reused by other listings. `DELETE /api/properties/{id}`
returns 409 if any reservation references the property; unpublish it instead to preserve historical trips.
`GET /api/admin/bookings?all=true` returns the full register; omitting `all` retains the review-queue API.

Payment completion is now explicitly stored as `Booking.paymentCompleted` (default false). Only records
marked completed count toward `totalRevenue`; neither confirmation nor the mock credit-card choice proves
payment. No payment-gateway, reconciliation endpoint, or real charge is introduced in Phase 4. Existing
bookings remain uncompleted rather than guessing their payment history. `upcomingCash` follows the requested
formula exactly: sum of all CONFIRMED + CASH_ON_ARRIVAL bookings. `estimatedRevenue` remains in the API for
backward compatibility as confirmed booking value. All sums are calculated with database decimal amounts.

## Phase 5: wishlists, review notifications, and information pages

Every property card has a heart button. Signing in lets guests save or remove a stay; `/wishlist`
is an authenticated, account-private collection. The navbar and footer both link to it. Duplicate saves
and removals are idempotent, and a unique `(user_id, property_id)` constraint prevents duplicate entries.
Unpublished stays are hidden from the grid without erasing the saved preference; deleting an unused
property removes its wishlist references, not its users.

Authenticated, subject-scoped API routes:

- `GET /api/users/me/wishlist`: saved, published properties, newest saves first.
- `GET /api/users/me/wishlist/ids`: IDs for synchronizing heart buttons across the site.
- `POST /api/users/me/wishlist/{propertyId}`: save a published property (204).
- `DELETE /api/users/me/wishlist/{propertyId}`: remove a save (204).
- `GET /api/users/me/notifications`: `{ unreadCount, notifications }`, latest 20 unread alerts.
- `PATCH /api/users/me/notifications/{id}/read`: mark an owned alert read (204).
- `PATCH /api/users/me/notifications/read-all`: mark only the current account's alerts read (204).

A successfully created review writes one notification for every registered ADMIN in the same database
transaction. Invalid, ineligible, and duplicate submissions do not create alerts. Notifications contain
the property title, not guest contact or ID details. Other recipients' alerts return 404 even for admins.
The bell refreshes on open, window focus, and every 30 seconds while the document is visible; opening it
does not mark anything read. Individual and bulk read actions are explicit. The UI shows errors and retries
without treating failed API calls as an empty wishlist/inbox. All browser actions use server-side
`lib/api.ts` JWT forwarding. No new browser-exposed credentials or dependencies are required.

Hibernate `ddl-auto=update` creates `wishlist_entries` and `notifications` on backend startup.
Rebuild both services with `docker compose up -d --build`; the existing database and upload volumes are retained.

Public `/about`, `/contact`, `/privacy`, and `/terms` pages share the Marrakesh theme and working footer links.
Optional `SUPPORT_EMAIL` and `SUPPORT_PHONE` values in root `.env` (Docker) or `frontend/.env.local`
(local Next.js) populate the contact page at runtime. Without configured values it explains that support
details are not available; there is no fake contact form or invented destination. Privacy and Terms describe
the application without development banners. They still require an operator-specific legal review before
public launch; removing UI boilerplate does not supply missing legal/operator details.

### Wishlist and notification refinements

- Property details now have a labeled **Save to wishlist** toggle synchronized with card hearts.
- Successful admin booking approval creates a guest alert; approved cancellation creates a separate guest
  alert. These records commit in the same transaction as the status change. Conflicting retries and rejected
  decisions do not emit approval alerts. Client notification links open the corresponding profile booking.
- Notifications include an optional `targetUrl` column (added by Hibernate update). New review alerts link
  directly to `/admin/bookings?tab=reviews&review={id}` and open the corresponding detail popup.
- Booking Control contains All, Booking Requests, Cancellation Requests, and Reviews. All retains the full
  reservation history and also includes guest reviews. `GET /api/admin/reviews` is ADMIN-only and returns
  review text, rating, author contacts, timestamps, and property details/media. Admin booking responses also
  include `property` details/media. Neither endpoint exposes private ID paths or OAuth identifiers.
- Clicking a reservation or review opens a keyboard-accessible native dialog with property photos, links,
  and full details. Reservation decisions can also be made inside the dialog. Unpublished properties link
  to the protected studio rather than a missing public page.
- Long demo/draft banners have been removed. Credit cards remain clearly marked **Test mode · No real
  charge**, because this application still has no live payment gateway.

## Verification

```text
cd backend
.\mvnw.cmd -q test
cd ../frontend
npm run lint
npm run typecheck
```