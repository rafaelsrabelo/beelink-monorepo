// Types
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  /**
   * Stable and top-level in Next 16 — `experimental.typedRoutes` is the deprecated spelling. With
   * it off, `next typegen` emits no route helpers and every `PageProps<"/…">` and
   * `RouteContext<"/…">` annotation in this app stops resolving. `type-check` runs the typegen
   * before tsc for that reason; running tsc alone reports those types as missing.
   */
  typedRoutes: true,
  images: {
    /**
     * Every product image the legacy bee-link ever uploaded lives here, and the migration moves
     * rows, never bytes: the URLs already in the database keep pointing at Cloudinary after cutover.
     */
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" }],
  },
}

export default nextConfig
