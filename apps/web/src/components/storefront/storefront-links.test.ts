// Libs
import { describe, expect, it } from "vitest"

// App
import { orderHrefOf, storefrontLinksOf } from "./storefront-links"

/** Only the fields these two functions read; the rest of PublicStore is irrelevant here. */
function shop(social: Partial<Record<string, string | null>>) {
  return {
    socialNetworks: {
      whatsapp: null,
      instagram: null,
      tiktok: null,
      spotify: null,
      youtube: null,
      ...social,
    },
  } as never
}

describe("storefrontLinksOf", () => {
  it("expands each handle into the address its network uses", () => {
    expect(
      storefrontLinksOf(shop({ instagram: "padaria", tiktok: "padaria", youtube: "padaria" })),
    ).toEqual([
      { network: "instagram", href: "https://instagram.com/padaria" },
      { network: "tiktok", href: "https://tiktok.com/@padaria" },
      { network: "youtube", href: "https://youtube.com/@padaria" },
    ])
  })

  // Spotify is stored as a full URL because it has no handle the web can expand — an artist, a
  // playlist and a user live on different paths.
  it("passes Spotify through, because it was never a handle", () => {
    expect(storefrontLinksOf(shop({ spotify: "https://open.spotify.com/artist/42" }))).toEqual([
      { network: "spotify", href: "https://open.spotify.com/artist/42" },
    ])
  })

  it("offers nothing for a shop that filled nothing in", () => {
    expect(storefrontLinksOf(shop({}))).toEqual([])
  })

  // WhatsApp is the order button, not a social icon: it has its own place on the page.
  it("keeps WhatsApp out of the social row", () => {
    expect(storefrontLinksOf(shop({ whatsapp: "5585999998888" }))).toEqual([])
  })
})

describe("orderHrefOf", () => {
  it("builds wa.me from the digits the column stores", () => {
    expect(orderHrefOf(shop({ whatsapp: "5585999998888" }))).toBe("https://wa.me/5585999998888")
  })

  it("strips anything that is not a digit, however it was stored", () => {
    expect(orderHrefOf(shop({ whatsapp: "+55 (85) 99999-8888" }))).toBe("https://wa.me/5585999998888")
  })

  /**
   * A shop carried over without a number gets no button, rather than one that opens WhatsApp with
   * nobody on the other end.
   */
  it.each([[null], [""], ["   "]])("gives nothing for %s", (whatsapp) => {
    expect(orderHrefOf(shop({ whatsapp }))).toBeUndefined()
  })
})
