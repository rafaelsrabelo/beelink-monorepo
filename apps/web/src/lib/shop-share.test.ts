// Libs
import { describe, expect, it } from "vitest"

// App
import fixtures from "./shop-share.fixtures.json"
import { shopShareImageOf, shopShareOf, shopThemeColorOf, type SharedShop } from "./shop-share"
import { storefrontRoutes } from "./storefront-routes"

const CLOUD = "https://res.cloudinary.com/demo/image/upload"
const logo = `${CLOUD}/v1791575929/bee-link/logo.png`
const banner = `${CLOUD}/v1791575930/bee-link/capa.webp`

const LOGO_STEPS = "c_fit,w_560,h_400/c_lpad,w_1200,h_630,b_rgb:3b7af7/f_jpg"
const BANNER_STEPS = "c_fill,w_1200,h_630/f_jpg"

const shop = (over: Partial<SharedShop> = {}): SharedShop => ({ name: "Loja Amora", logoUrl: logo, bannerImageUrl: null, colors: fixtures.colors, ...over })

describe("shopShareImageOf", () => {
  it("is the logo, fitted whole into a box and centred on the header's colour, in a preview's frame", () => {
    expect(shopShareImageOf(shop())).toEqual({
      url: `${CLOUD}/${LOGO_STEPS}/v1791575929/bee-link/logo.png`,
      width: 1200,
      height: 630,
      alt: "Loja Amora",
      type: "image/jpeg",
    })
  })

  // `c_pad` there scales the fitted logo back up to the frame's edges, measured on a real logo: the margin is `c_lpad`'s.
  it("pads without scaling the logo back up", () => {
    const steps = shopShareImageOf(shop())?.url.slice(CLOUD.length + 1).split("/")

    expect(steps?.[1]).toMatch(/^c_lpad,/)
    expect(steps?.join("/")).not.toContain("c_pad")
  })

  it("is the logo even for a shop that has a cover too", () => {
    expect(shopShareImageOf(shop({ bannerImageUrl: banner }))?.url).toBe(`${CLOUD}/${LOGO_STEPS}/v1791575929/bee-link/logo.png`)
  })

  it("is the cover, cut to the frame, for a shop with no logo", () => {
    expect(shopShareImageOf(shop({ logoUrl: null, bannerImageUrl: banner }))).toEqual({
      url: `${CLOUD}/${BANNER_STEPS}/v1791575930/bee-link/capa.webp`,
      width: 1200,
      height: 630,
      alt: "Loja Amora",
      type: "image/jpeg",
    })
  })

  it("is none for a shop with neither", () => {
    expect(shopShareImageOf(shop({ logoUrl: null }))).toBeNull()
  })

  // No measures and no type are said of it: nothing here knows them.
  it("hands over as it came a picture that is not an upload at Cloudinary", () => {
    for (const elsewhere of [
      "https://cdn.exemplo.com/logo.png",
      "https://res.cloudinary.com.exemplo.com/demo/image/upload/v1/logo.png",
      "https://exemplo.com/res.cloudinary.com/demo/image/upload/v1/logo.png",
      "https://res.cloudinary.com/demo/image/fetch/https://exemplo.com/logo.png",
      "https://res.cloudinary.com/demo/video/upload/v1/logo.mp4",
    ]) {
      expect(shopShareImageOf(shop({ logoUrl: elsewhere })), elsewhere).toEqual({ url: elsewhere })
      expect(shopShareImageOf(shop({ logoUrl: null, bannerImageUrl: elsewhere })), elsewhere).toEqual({ url: elsewhere })
    }
  })

  // A preview is kept by its picture's address: a new logo or a new colour has to be a new one.
  it("has another address when the logo changes, and when the colour does", () => {
    const first = shopShareImageOf(shop())?.url
    const otherLogo = shopShareImageOf(shop({ logoUrl: `${CLOUD}/v1791600000/bee-link/nova.png` }))?.url
    const otherColour = shopShareImageOf(shop({ colors: { ...fixtures.colors, header: fixtures.darkHeader } }))?.url

    expect(otherLogo).toBe(`${CLOUD}/${LOGO_STEPS}/v1791600000/bee-link/nova.png`)
    expect(otherColour).toBe(`${CLOUD}/c_fit,w_560,h_400/c_lpad,w_1200,h_630,b_rgb:190358/f_jpg/v1791575929/bee-link/logo.png`)
    expect(new Set([first, otherLogo, otherColour]).size).toBe(3)
  })

  it("takes the header's colour, and no other of the shop's", () => {
    const repainted = shop({ colors: { ...fixtures.colors, background: fixtures.darkHeader, primary: fixtures.darkHeader, footer: fixtures.darkHeader } })

    expect(shopShareImageOf(repainted)?.url).toBe(shopShareImageOf(shop())?.url)
  })

  it("writes one address for a colour, however its letters were typed", () => {
    const lower = shop({ colors: { ...fixtures.colors, header: fixtures.colors.header.toLowerCase() } })

    expect(shopShareImageOf(lower)?.url).toBe(shopShareImageOf(shop())?.url)
  })

  // Any other form in the address is an error from Cloudinary, and a preview with no picture at all.
  it("names no colour in the address when the shop's is not six hex digits", () => {
    for (const header of fixtures.notSixDigits) {
      expect(shopShareImageOf(shop({ colors: { ...fixtures.colors, header } }))?.url, header).toBe(`${CLOUD}/c_fit,w_560,h_400/c_lpad,w_1200,h_630/f_jpg/v1791575929/bee-link/logo.png`)
    }
  })

  it("goes before the version, after whatever the address already does to the picture", () => {
    expect(shopShareImageOf(shop({ logoUrl: `${CLOUD}/w_500,c_limit/v12/bee-link/logo.png` }))?.url).toBe(`${CLOUD}/w_500,c_limit/${LOGO_STEPS}/v12/bee-link/logo.png`)
    // A folder that reads like a version is not one: the first is.
    expect(shopShareImageOf(shop({ logoUrl: `${CLOUD}/v12/v2/logo.png` }))?.url).toBe(`${CLOUD}/${LOGO_STEPS}/v12/v2/logo.png`)
  })

  it("goes right after upload/ in an address that names no version", () => {
    expect(shopShareImageOf(shop({ logoUrl: `${CLOUD}/bee-link/logo.png` }))?.url).toBe(`${CLOUD}/${LOGO_STEPS}/bee-link/logo.png`)
  })
})

describe("shopShareOf", () => {
  const routeWords = { products: "produtos" } as Parameters<typeof storefrontRoutes>[0]["routeWords"]
  const page = { origin: "https://beelink.biz", path: "/loja-amora", title: "Loja Amora" }

  it("says whose page it is, where it is and what it is called", () => {
    expect(shopShareOf(shop(), page)).toMatchObject({ type: "website", url: "https://beelink.biz/loja-amora", siteName: "Loja Amora", title: "Loja Amora" })
  })

  it("carries the slug on the platform's host and none at the shop's own domain", () => {
    const onPlatform = storefrontRoutes({ slug: "loja-amora", routeWords })
    const atDomain = storefrontRoutes({ slug: "loja-amora", routeWords, ownDomain: true })

    expect(shopShareOf(shop(), { ...page, path: onPlatform.home })).toMatchObject({ url: "https://beelink.biz/loja-amora" })
    expect(shopShareOf(shop(), { ...page, path: onPlatform.product("bolsa") })).toMatchObject({ url: "https://beelink.biz/loja-amora/produtos/bolsa" })
    expect(shopShareOf(shop(), { ...page, origin: "https://lojaamora.com.br", path: atDomain.home })).toMatchObject({ url: "https://lojaamora.com.br/" })
    expect(shopShareOf(shop(), { ...page, origin: "https://lojaamora.com.br", path: atDomain.product("bolsa") })).toMatchObject({ url: "https://lojaamora.com.br/produtos/bolsa" })
  })

  it("shows the shop's picture, with its measures and the shop's name for whoever cannot see it", () => {
    expect(shopShareOf(shop(), page)).toMatchObject({ images: [shopShareImageOf(shop())] })
    expect(shopShareOf(shop(), { ...page, image: null })).toMatchObject({ images: [{ width: 1200, height: 630, alt: "Loja Amora" }] })
  })

  it("shows the page's own picture as it came, when it has one", () => {
    const photo = `${CLOUD}/v7/bee-link/bolsa.png`

    expect(shopShareOf(shop(), { ...page, image: photo })).toMatchObject({ images: [{ url: photo }] })
  })

  it("declares no picture for a shop with neither logo nor cover", () => {
    expect(shopShareOf(shop({ logoUrl: null }), page)).not.toHaveProperty("images")
  })

  // An empty key would stand in the way of the page's own description, which Next hands down to the card.
  it("carries the description it was given, and no key for one it was not", () => {
    expect(shopShareOf(shop(), { ...page, description: "Bolsas de crochê." })).toMatchObject({ description: "Bolsas de crochê." })
    expect(shopShareOf(shop(), page)).not.toHaveProperty("description")
  })
})

describe("shopThemeColorOf", () => {
  it("is the header's colour, the band right under the browser's bar", () => {
    expect(shopThemeColorOf({ colors: { ...fixtures.colors, header: fixtures.darkHeader } })).toEqual({ themeColor: fixtures.darkHeader })
  })

  it("is nothing for a slug no shop holds", () => {
    expect(shopThemeColorOf(null)).toEqual({})
  })
})
