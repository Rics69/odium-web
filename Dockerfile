# syntax=docker/dockerfile:1
# Production image. Targets: runner (the site) and migrator (one-shot
# migrations, also runs the seed). Built by compose.yml.

FROM node:24-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM deps AS build
COPY . .
# lib/env.ts checks the variables while Next.js collects page data. Pages
# render per request, so these placeholders never reach a page: the real
# values come from compose.yml at runtime.
ENV SITE_URL=http://localhost:3000 \
    DATABASE_URL=postgres://build:build@localhost:5432/build \
    BETTER_AUTH_SECRET=build-time-placeholder-never-used-at-runtime \
    SMTP_HOST=localhost \
    SMTP_PORT=25 \
    MAIL_FROM=build@localhost \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM deps AS migrator
COPY drizzle ./drizzle
COPY drizzle.config.ts tsconfig.json ./
COPY lib ./lib
COPY scripts ./scripts
CMD ["npx", "drizzle-kit", "migrate"]

FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN groupadd --system app && useradd --system --gid app --no-create-home app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
# Fonts for Open Graph images (app/(public)/games/[slug]/opengraph-image.tsx).
COPY --from=build --chown=app:app /app/assets ./assets
RUN mkdir -p storage && chown app:app storage
USER app
EXPOSE 3000
CMD ["node", "server.js"]
