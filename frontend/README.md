# KEYRAK Frontend — Phase 4

Next.js App Router frontend for the KEYRAK real-estate marketplace. The Marrakesh design system and Google SSO
bridge now power backend-connected AI search, property detail data, availability calendars, booking requests,
an equirectangular 360° viewer, management dashboards, a client trip portal, and global API feedback.

## Local setup

1. Copy `.env.local.example` to `.env.local`.
2. Create a Google OAuth web application and add this authorized redirect URI:

   `http://localhost:3000/api/auth/callback/google`

3. Set `JWT_SECRET` to exactly the same value used by the Spring Boot backend. Keep it server-only and never
   rename it with a `NEXT_PUBLIC_` prefix.
4. Install and start the app:

```text
npm install
npm run dev
```

Open `http://localhost:3000`. The backend defaults to `http://localhost:8080`.

Set `NEXT_PUBLIC_BACKEND_API_URL` to the public Spring Boot **origin** (no `/api` suffix):
`http://localhost:8080` locally, or `https://keyrak.onrender.com` on Vercel. This is not a secret.
It is embedded at build time, so changing it requires rebuilding/redeploying the frontend.
`BACKEND_API_URL` is still the separate server-side API origin. Uploaded media paths are resolved by
`lib/property-media-url.ts`; absolute CDN links and bundled frontend assets are preserved.

## Authentication contract

Auth.js stores the Google login in its own encrypted JWT session using `NEXTAUTH_SECRET`. Separately, the server
creates a short-lived HS256 access token for Spring Boot using `JWT_SECRET`. That API token contains `sub`,
`email`, `name`, `picture`, `email_verified`, `roles`, `iss`, `aud`, `iat`, and `exp` claims. It is exposed on the
typed Auth.js session and injected automatically by `lib/api.ts` for server-side protected requests.

Interactive client components call authenticated Server Actions. Those actions re-check the Auth.js session and
use `lib/api.ts`, keeping the backend URL and JWT signing secret out of the browser bundle.

## Application routes

- `/search?mode=ai&q=...` sends the natural-language query to Groq through Spring Boot, populates the returned
  filter state, and then queries `/api/properties/search` through the standard search pipeline.
- `/properties/[id]` loads live property media and blocked dates. Booking requests are submitted as `PENDING`.
- `/admin/properties/new` is restricted to users whose synchronized backend role is `ADMIN`.
- `/admin/dashboard` shows active inventory, pending requests, and confirmed booking value for administrators.
- `/admin/bookings` lets administrators approve or reject pending requests.
- `/profile` is private and shows only bookings owned by the authenticated Google subject.

The property studio accepts a normal image, optional video, and optional equirectangular 360° image URL. For a
correct panorama, use a 2:1 equirectangular source or an image containing valid panorama XMP metadata.

## Verification

```text
npm run lint
npm test
npm run typecheck
npm run build
```

Vercel uses the standard Next.js output. The Dockerfile sets `NEXT_BUILD_OUTPUT=standalone` so its build
generates the standalone server. Compose supplies runtime secrets and the
public media origin build argument; never expose JWT/Google secrets through `NEXT_PUBLIC_` variables.

The Compose frontend runs a built image, not a hot-reloading source mount. After changing application code,
run `docker compose up -d --build --no-deps backend frontend` from the repository root, then refresh the page.
This replaces only the application containers; it keeps the existing database and uploaded-file volumes.
