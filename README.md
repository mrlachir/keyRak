# KEYRAK Marketplace

KEYRAK is a Java 17 Spring Boot and Next.js real-estate marketplace with Google SSO, HS256 API tokens, Gemini
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
`JWT_SECRET` is mounted into both application containers; database and Gemini credentials are never written into
an image. The database healthcheck gates backend startup, and the backend healthcheck gates frontend startup.

Useful operations:

```text
docker compose ps
docker compose logs -f backend frontend
docker compose down
```

`docker compose down` keeps MySQL data. Removing the named volume is intentionally a separate, destructive
operation.
