// Node
import path from "node:path"

// Types
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  /**
   * What docker/web.Dockerfile ships: a traced server with only the files it loads. Traced from the
   * monorepo root, not from apps/web — packages/ui is read as source and the hoisted node_modules
   * sit at the root, so a trace rooted here would leave both out of the image.
   */
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  /**
   * Stable and top-level in Next 16 — `experimental.typedRoutes` is the deprecated spelling. With
   * it off, `next typegen` emits no route helpers and every `PageProps<"/…">` and
   * `RouteContext<"/…">` annotation in this app stops resolving. `type-check` runs the typegen
   * before tsc for that reason; running tsc alone reports those types as missing.
   */
  typedRoutes: true,
  images: {
    /**
     * AVIF first, for a browser that takes it: the brand's photos (`src/assets/images`) come out a
     * fifth smaller than as WebP. It costs encoding time once per width, on the first request.
     */
    formats: ["image/avif", "image/webp"],
    /**
     * Every product image the legacy bee-link ever uploaded lives here, and the migration moves
     * rows, never bytes: the URLs already in the database keep pointing at Cloudinary after cutover.
     */
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" }],
  },
}

export default nextConfig
