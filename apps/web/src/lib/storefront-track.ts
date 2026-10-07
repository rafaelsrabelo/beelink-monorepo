// App
import { metaEventOf } from "./meta-pixel-event"
import { sendToMetaPixel } from "./meta-pixel"
import { isQuietPath, newEventId, type StorefrontEvent, type Track, type TrackOptions } from "./storefront-event"

export interface TrackInput {
  /** The shop's Meta Pixel; null for a shop with none. */
  pixelId: string | null
  /** `marketingAllowed()` for this shop and this visitor, as it stands now. */
  allowed: boolean
  /** The shop's pages nothing is told from (`quietPathsOf`). */
  quietPaths: readonly string[]
}

/**
 * The one point every storefront event passes through (BEELINK-272). Each call is decided on its
 * own: the shop has a pixel, the visitor said yes here, and the page is not one whose address holds
 * a token. Only then is the event given an id and sent — to this shop's pixel, by name.
 *
 * A page is told before anything that happens on it, and once: whichever event comes first from a
 * path brings the page's view with it, and a page view asked for a path already told is not sent
 * again. That holds whatever order the page's effects run in, and however often they do.
 *
 * An event refused is dropped, never kept for later: what a visitor did before saying yes is not
 * told once they do. The answer says which it was — true for one handed to the pixel. A second destination — the shop's own record of the event — is a second line
 * in `send`.
 */
export function createTrack({ pixelId, allowed, quietPaths }: TrackInput): Track {
  let page: string | null = null

  return (event, options) => {
    if (!allowed || !pixelId) return false

    const pathname = window.location.pathname
    if (isQuietPath(pathname, quietPaths)) return false

    const send = (told: StorefrontEvent, as?: TrackOptions) => sendToMetaPixel(pixelId, metaEventOf(told), as?.id ?? newEventId())
    if (page !== pathname) {
      page = pathname
      send({ name: "PageView" })
    }
    if (event.name !== "PageView") send(event, options)
    return true
  }
}
