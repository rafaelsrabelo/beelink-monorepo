# syntax=docker/dockerfile:1
#
# The API image, built from the repository root: `docker build -f docker/api.Dockerfile .`
#
# Three stages. `build` compiles and is also the image the `migrate` service runs, because it is the
# one that still has the Prisma CLI, prisma.config.ts, the migrations and the seed. `runtime` carries
# only dist/ and the production dependencies.

FROM node:24-bookworm-slim AS base
# pnpm comes from corepack at the version package.json's `packageManager` pins. HUSKY=0: the root
# `prepare` script would try to install git hooks in a tree with no .git.
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    HUSKY=0 \
    CI=true
RUN corepack enable
WORKDIR /app

FROM base AS build
# Prisma's schema engine, which `migrate deploy` runs, links against libssl; the slim image has none.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
# The lockfile alone decides what is downloaded, so a source change does not refetch every package.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm fetch
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --offline --frozen-lockfile --filter "api..."
# `build` only reads the Prisma client — under turbo, `generate` writes it first — so the image generates it here.
RUN pnpm --filter api generate && pnpm --filter api build
# --legacy: pnpm 10 refuses a plain deploy unless workspace packages are injected, and the API has
# no workspace package at runtime — contracts is types only, a devDependency.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm --filter api deploy --legacy --prod /prod/api

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /prod/api ./
USER node
EXPOSE 3001
CMD ["node", "dist/main.js"]
