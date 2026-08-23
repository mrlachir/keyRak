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

## Authentication contract

Auth.js stores the Google login in its own encrypted JWT session using `NEXTAUTH_SECRET`. Separately, the server
creates a short-lived HS256 access token for Spring Boot using `JWT_SECRET`. That API token contains `sub`,
`email`, `name`, `picture`, `email_verified`, `roles`, `iss`, `aud`, `iat`, and `exp` claims. It is exposed on the
typed Auth.js session and injected automatically by `lib/api.ts` for server-side protected requests.

Interactive client components call authenticated Server Actions. Those actions re-check the Auth.js session and
use `lib/api.ts`, keeping the backend URL and JWT signing secret out of the browser bundle.

## Application routes

- `/search?q=...` sends the natural-language query to Gemini through Spring Boot and uses the returned location,
  guest count, and amenities to query `/api/properties/search`.
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
npm run typecheck
npm run build
```

Production builds use Next.js standalone output. The root `docker-compose.yml` supplies all runtime secrets and
internal service URLs; no `NEXT_PUBLIC_` credential is required.
