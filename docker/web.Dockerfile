# syntax=docker/dockerfile:1
#
# The web image, built from the repository root: `docker build -f docker/web.Dockerfile .`
#
# next.config.ts sets `output: "standalone"`: the build traces the files each route loads and copies
# them, with the node_modules they need, into .next/standalone. The runtime stage carries only that,
# plus the two folders the trace leaves out on purpose — .next/static and public.

FROM node:24-bookworm-slim AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    HUSKY=0 \
    CI=true \
    NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app

FROM base AS build
# Inlined into the browser bundle by `next build`: a new key is a new deploy, a restart changes
# nothing. It is public by design — the tiles are fetched by the page — and restricted by origin in
# MapTiler. API_URL is not here: it is server-only and read at runtime.
ARG NEXT_PUBLIC_MAPTILER_TILE_KEY=""
ENV NEXT_PUBLIC_MAPTILER_TILE_KEY=$NEXT_PUBLIC_MAPTILER_TILE_KEY
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm fetch
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --offline --frozen-lockfile --filter "web..."
RUN pnpm --filter web build

FROM node:24-bookworm-slim AS runtime
# HOSTNAME=0.0.0.0: the standalone server otherwise binds to the container's hostname, and Traefik,
# arriving on another interface, gets connection refused.
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
# The standalone tree mirrors the monorepo from its root, so server.js sits at apps/web/.
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /app/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
