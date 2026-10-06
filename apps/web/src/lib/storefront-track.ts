// App
import { metaEventOf } from "./meta-pixel-event"
import { sendToMetaPixel } from "./meta-pixel"
import { isQuietPath, newEventId, type Track } from "./storefront-event"

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
 * An event refused is dropped, never kept for later: what a visitor did before saying yes is not
 * told once they do. A second destination — the shop's own record of the event — is a second line
 * at the end of this function.
 */
export function createTrack({ pixelId, allowed, quietPaths }: TrackInput): Track {
  return (event, options) => {
    if (!allowed || !pixelId) return
    if (isQuietPath(window.location.pathname, quietPaths)) return

    sendToMetaPixel(pixelId, metaEventOf(event), options?.id ?? newEventId())
  }
}
