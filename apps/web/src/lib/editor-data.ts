// Next
import { cookies } from "next/headers"

// Types
import type { PagePreview } from "@harness-monorepo/contracts"

// App
import { callApi } from "./api"
import { ACCESS_COOKIE } from "./session-cookies"

/**
 * A landing as its owner previews it, whatever its status, for design mode's canvas: the page and
 * its bands resolved as a visitor would be served them.
 *
 * The owner's read and not the storefront's, because a draft is served to nobody else — so it is
 * never cached (`callApi` is `no-store`) and it carries the session's own token, read here on the
 * server where the page JavaScript never holds it. Null for an id that is not a page of this shop,
 * which the page answers by going back to the home.
 */
export async function pagePreviewAt(slug: string, pageId: string): Promise<PagePreview | null> {
  const accessToken = (await cookies()).get(ACCESS_COOKIE)?.value
  if (!accessToken) return null

  const response = await callApi({
    path: `/stores/${encodeURIComponent(slug)}/pages/${encodeURIComponent(pageId)}/preview`,
    method: "GET",
    accessToken,
  }).catch(() => null)

  if (!response?.ok) return null

  return (await response.json()) as PagePreview
}
