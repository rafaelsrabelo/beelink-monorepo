// Next
import { headers } from "next/headers"

/**
 * The origin the visitor addressed, for the absolute addresses a link preview needs: WhatsApp and
 * the others fetch `og:image` from outside, and ignore a relative one.
 *
 * Read from the request because the web has no setting that says its own address yet (BEELINK-247
 * brings one, and `metadataBase` with it; this gives way to it then). The host is taken as
 * `publicOriginOf()` in `bff.ts` takes it — `x-forwarded-host`, which Traefik overwrites — and the
 * scheme is https everywhere but on a developer's machine, where nothing terminates TLS.
 */
export async function siteOrigin(): Promise<string> {
  const incoming = await headers()
  const host = incoming.get("x-forwarded-host")?.split(",")[0]?.trim() || incoming.get("host") || "localhost:3000"
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)

  return `${local ? "http" : "https"}://${host}`
}
