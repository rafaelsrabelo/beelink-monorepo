// Node
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

// Libs
import { describe, expect, it } from "vitest"

// App
import { shopIconsOf } from "./shop-icon"

const icon = "https://cdn.exemplo.com/icone.png"
const logo = "https://cdn.exemplo.com/logo.png"

describe("shopIconsOf", () => {
  it("declares the shop's own icon for the tab and for a phone's home screen, whatever its logo is", () => {
    expect(shopIconsOf({ faviconUrl: icon, logoUrl: logo })).toEqual({ icons: { icon: [{ url: icon }], apple: [{ url: icon }] } })
    expect(shopIconsOf({ faviconUrl: icon, logoUrl: null })).toEqual({ icons: { icon: [{ url: icon }], apple: [{ url: icon }] } })
  })

  it("declares the logo while the shop has chosen no icon", () => {
    expect(shopIconsOf({ faviconUrl: null, logoUrl: logo })).toEqual({ icons: { icon: [{ url: logo }], apple: [{ url: logo }] } })
  })

  // No `icons` key at all, not an empty one: Next adds bee-link's own files only where no segment set it.
  it("declares nothing with neither, nor for a slug no shop holds, so the page keeps bee-link's", () => {
    expect(shopIconsOf({ faviconUrl: null, logoUrl: null })).toEqual({})
    expect(shopIconsOf(null)).toEqual({})
    expect(shopIconsOf(null)).not.toHaveProperty("icons")
  })
})

/**
 * What the function cannot hold by itself: where it is called, and what Next adds around it. Read
 * from the sources, because none of it fails a type-check or a render.
 */
describe("the icons of a shop's pages, in the app's tree", () => {
  const app = join(process.cwd(), "src", "app")
  const read = (file: string) => readFileSync(join(app, file), "utf8")
  const shopFiles = (readdirSync(join(app, "[slug]"), { recursive: true }) as string[]).map((file) => `[slug]/${file.replaceAll("\\", "/")}`).filter((file) => /\.tsx$/.test(file))

  it("is declared by the shop's layout, over every page of the shop", () => {
    expect(read("[slug]/layout.tsx")).toContain("return shopIconsOf(await shopAt(slug))")
  })

  // A page's own `icons` would replace the layout's, key for key, and that page alone would lose the shop's.
  it("is set by no page under it", () => {
    const pages = shopFiles.filter((file) => file.endsWith("page.tsx"))

    expect(pages.length).toBeGreaterThan(3)
    for (const page of pages) expect(read(page), page).not.toMatch(/\bicons\s*:/)
  })

  // From `app/`, Next puts `favicon.ico` first in every head whatever `icons` says: a shop's tab would
  // be handed bee-link's beside its own. From `public/` it still answers at `/favicon.ico`, on any
  // host — which is what the API's check of a shop's domain asks for.
  it("keeps favicon.ico out of app/ and in public/", () => {
    expect(existsSync(join(app, "favicon.ico"))).toBe(false)
    expect(existsSync(join(process.cwd(), "public", "favicon.ico"))).toBe(true)
  })

  // bee-link's own pages declare no `icons`, which is what leaves them these two files.
  it("leaves bee-link's own icons to the pages that are not a shop's", () => {
    expect(existsSync(join(app, "icon.png"))).toBe(true)
    expect(existsSync(join(app, "apple-icon.png"))).toBe(true)
    expect(read("layout.tsx")).not.toMatch(/\bicons\s*:/)
  })
})
