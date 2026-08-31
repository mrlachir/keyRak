FROM node:22-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS build
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
ENV NEXTAUTH_URL=http://localhost:3000
ENV NEXTAUTH_SECRET=build-only-nextauth-secret-at-least-32-bytes
ENV GOOGLE_CLIENT_ID=build-only-google-client-id
ENV GOOGLE_CLIENT_SECRET=build-only-google-client-secret
ENV JWT_SECRET=build-only-jwt-secret-at-least-32-bytes
ENV BACKEND_API_URL=http://backend:8080
ARG NEXT_PUBLIC_BACKEND_API_URL=http://localhost:8080
ENV NEXT_PUBLIC_BACKEND_API_URL=${NEXT_PUBLIC_BACKEND_API_URL}
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --chown=nextjs:nodejs docker-entrypoint.sh /usr/local/bin/keyrak-entrypoint
RUN chmod 0555 /usr/local/bin/keyrak-entrypoint

USER nextjs
EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/keyrak-entrypoint"]
