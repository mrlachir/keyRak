# KEYRAK Marketplace Backend — Phase 4

Spring Boot 3 / Java 17 backend scaffold for the decoupled KEYRAK real-estate SaaS marketplace.

## Architecture implemented

- MySQL persistence through Spring Data JPA and Hibernate (`ddl-auto: update`).
- UUID primary keys for users, properties, property media, and bookings; integer identity keys for tags.
- The `property_tags` junction table owns the property/tag many-to-many association.
- Stateless Spring Security resource server with HS256 JWT signature, issuer, expiry, and audience validation.
- Automatic synchronization of trusted Google SSO claims into the local `users` table.
- Groq semantic-search endpoint using native JSON mode for structured property filters.
- Public property search/detail and blocked-date endpoints.
- Conflict-safe booking creation that serializes requests per property and calculates total price on the server.
- Administrator-only property creation and Groq property-description generation.
- Administrator-only KPI aggregation and locked pending-booking moderation.
- Subject-scoped client booking history that never accepts a user ID from the browser.

The earlier reusable implementation's `X-User-Email` header is intentionally not accepted because clients could
forge it. The backend only derives identity from a successfully validated bearer token.

## Required environment

Copy `.env.example` into the environment used to launch the application. Spring Boot does not automatically load
`.env` files, so export the variables in your shell/IDE or configure them in the deployment platform.

`JWT_SECRET` must contain at least 32 bytes and must only be available to the Next.js server and Spring backend.
Do not expose it through `NEXT_PUBLIC_*` variables. The frontend-issued API token must contain:

- Header: `alg=HS256`
- Claims: `iss`, `aud`, `sub`, `email`, `iat`, `exp`
- Optional Google profile claims: `email_verified`, `name`, `picture`
- Optional authorization claim: `roles` (for example `["ADMIN"]`)

The default expected issuer is `keyrak-nextauth` and the default audience is `keyrak-api`.

## Run and test

```text
./mvnw test
./mvnw spring-boot:run
```

On Windows, use `mvnw.cmd` instead. A running MySQL instance and the required environment variables are needed to
start the application normally; tests use an isolated H2 database in MySQL compatibility mode.

For the new database-free unit suite, JaCoCo coverage reports, and manual SonarCloud upload instructions,
see [Testing and coverage](TESTING.md). `./mvnw clean verify` generates the HTML and XML reports automatically.

## API surface

- `POST /api/ai/search` — public semantic intent parsing.
- `POST /api/ai/description` — authenticated `ADMIN` copywriting.
- `GET /api/properties/search` and `GET /api/properties/{id}` — public discovery data.
- `GET /api/properties/{id}/blocked-dates` — pending and confirmed reserved nights.
- `POST /api/bookings` — authenticated, conflict-checked `PENDING` booking request.
- `POST /api/properties` — authenticated `ADMIN` property creation.
- `GET /api/admin/dashboard/metrics` — authenticated `ADMIN` operational aggregates.
- `GET /api/admin/bookings` — authenticated `ADMIN` pending-review queue.
- `PATCH /api/admin/bookings/{id}/status` — authenticated `ADMIN` confirmation or cancellation.
- `GET /api/bookings/me` — authenticated client booking history from the JWT subject.

Booking decisions lock the target row and allow a single transition from `PENDING` to `CONFIRMED` or `CANCELLED`.
Estimated revenue is the sum of `CONFIRMED` booking totals.
