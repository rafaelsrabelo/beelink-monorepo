// Next
import type { Metadata, Viewport } from "next"

// Types
import type { PublicStore } from "@harness-monorepo/contracts"

/** The frame a link preview is drawn from: Open Graph's own 1.91:1. */
const FRAME = { width: 1200, height: 630 }

/**
 * The box the logo is fitted into, inside the frame. Narrower than the frame is tall: a preview drawn
 * as a small square keeps the frame's middle 630, and a long logo has to be whole in that one too.
 */
const LOGO_BOX = { width: 560, height: 400 }

/**
 * An upload's address at Cloudinary, cut where a transformation goes: before the version, which is
 * where an address the upload answered has it — whatever the address already does to the picture
 * is done first. The first version, since a folder may read like one. An address that names no
 * version takes it right after `upload/`.
 */
const VERSIONED = /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/(?:.+?\/)??)(v\d+\/.+)$/
const UNVERSIONED = /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/

/**
 * The one form the API saves a colour in. Checked again because the colour is written into an
 * address: any other form there is an error from Cloudinary, and a preview with no picture.
 */
const HEX_COLOR = /^#([0-9a-f]{6})$/i

export interface ShareImage {
  url: string
  width?: number
  height?: number
  alt?: string
  type?: string
}

/** What of a shop its link preview is made of. */
export type SharedShop = Pick<PublicStore, "name" | "logoUrl" | "bannerImageUrl" | "colors">

function transformed(source: string, steps: readonly string[]): string | null {
  const match = VERSIONED.exec(source) ?? UNVERSIONED.exec(source)

  return match ? `${match[1]}${steps.join("/")}/${match[2]}` : null
}

/**
 * JPEG whatever was uploaded: nothing says a preview's reader takes WebP, and a cover kept as PNG at
 * this size can weigh more than the 600 KB WhatsApp asks to stay under. The address keeps the
 * file's extension, so the type is said beside it.
 */
function framed(store: SharedShop, source: string, steps: readonly string[]): ShareImage {
  const url = transformed(source, [...steps, "f_jpg"])

  return url ? { url, ...FRAME, alt: store.name, type: "image/jpeg" } : { url: source }
}

/**
 * The picture a shop's shared link shows (BEELINK-248): its logo, whole, centred on the colour the
 * shop window paints behind it — the header's — in a preview's frame. A raw logo is whatever shape
 * it was drawn in, and WhatsApp asks for a picture no wider than 4:1.
 *
 * Made by Cloudinary from the address alone: no route draws it and nothing is stored. The logo and
 * the colour are both in the address, so a shop that changes either has a new picture at a new
 * address — a preview is kept by its picture's address, and the old one is never asked for again.
 *
 * `c_lpad` and not `c_pad` for the frame: `c_pad` scales the fitted logo back up until it touches
 * the frame, and the margin is gone.
 *
 * With no logo, the cover cut to the frame; with neither, none. A picture kept anywhere but
 * Cloudinary is handed over as it came.
 */
export function shopShareImageOf(store: SharedShop): ShareImage | null {
  const frame = `w_${FRAME.width},h_${FRAME.height}`

  if (store.logoUrl) {
    const colour = HEX_COLOR.exec(store.colors.header)?.[1]?.toLowerCase()

    return framed(store, store.logoUrl, [`c_fit,w_${LOGO_BOX.width},h_${LOGO_BOX.height}`, `c_lpad,${frame}${colour ? `,b_rgb:${colour}` : ""}`])
  }

  return store.bannerImageUrl ? framed(store, store.bannerImageUrl, [`c_fill,${frame}`]) : null
}

export interface SharedPage {
  /** The origin the visitor addressed: `siteOrigin()`. */
  origin: string
  /** The page's address as `storefrontRoutes(store)` spells it on this request — no slug at the shop's own domain. */
  path: string
  title: string
  description?: string
  /** The page's own picture — a product's photo, a landing's. With none, the shop's. */
  image?: string | null
}

/**
 * What a link preview reads of one page of a shop: whose it is, where it is, and a picture.
 *
 * Every page of a shop declares its Open Graph through here, whole. Next merges metadata by key, so
 * a page's `openGraph` replaces a layout's rather than adding to it: the shop's name set once, in
 * the layout, would be gone from every page that names its own title.
 *
 * The address is absolute and the request's own, because a preview is fetched from outside and the
 * web has no setting for its address yet (BEELINK-247). No `twitter` is declared: Next fills the
 * card from these same values.
 */
export function shopShareOf(store: SharedShop, page: SharedPage): NonNullable<Metadata["openGraph"]> {
  const image = page.image ? { url: page.image } : shopShareImageOf(store)

  return {
    type: "website",
    url: `${page.origin}${page.path}`,
    siteName: store.name,
    title: page.title,
    ...(page.description ? { description: page.description } : {}),
    ...(image ? { images: [image] } : {}),
  }
}

/** The colour a phone's browser paints its own bar in, over a shop's pages: the header's, which sits right under it. */
export function shopThemeColorOf(store: Pick<PublicStore, "colors"> | null): Viewport {
  return store ? { themeColor: store.colors.header } : {}
}
