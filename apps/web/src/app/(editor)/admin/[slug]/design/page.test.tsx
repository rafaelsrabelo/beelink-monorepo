// Libs
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

// App
import type { ServedShop } from "@/lib/storefront-data"
import { messagesFor } from "@/locales"

const mocks = vi.hoisted(() => ({ shopAt: vi.fn(), categoriesAt: vi.fn(), pagePreviewAt: vi.fn(), redirect: vi.fn((to: string) => { throw new Error(`NEXT_REDIRECT ${to}`) }) }))

vi.mock("server-only", () => ({}))
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, notFound: () => { throw new Error("NEXT_NOT_FOUND") } }))
// next/font runs only in Next's compiler.
vi.mock("@/components/storefront/shop-font", () => ({ figtree: { variable: "font-figtree", style: {} }, shopFontStyle: {} }))
vi.mock("@/components/design/design-screen", () => ({ DesignScreen: () => <p>o editor</p> }))
vi.mock("@/lib/locale", () => ({ getMessages: async () => ({ ...messagesFor("pt-BR"), locale: "pt-BR" }) }))
vi.mock("@/lib/storefront-data", () => ({ shopAt: mocks.shopAt, categoriesAt: mocks.categoriesAt }))
vi.mock("@/lib/editor-data", async (original) => ({ ...(await original<typeof import("@/lib/editor-data")>()), pagePreviewAt: mocks.pagePreviewAt }))

import DesignPage from "./page"

const shop = { slug: "loja-amora", name: "Loja Amora", type: "ECOMMERCE" } as unknown as ServedShop
const home = { page: { id: "home-id", kind: "HOME" }, sections: [] }
const at = (query: Record<string, string> = {}) => ({ params: Promise.resolve({ slug: "loja-amora" }), searchParams: Promise.resolve(query) }) as unknown as PageProps<"/admin/[slug]/design">

beforeEach(() => {
  mocks.redirect.mockClear()
  mocks.shopAt.mockResolvedValue(shop)
  mocks.categoriesAt.mockResolvedValue([])
  mocks.pagePreviewAt.mockResolvedValue(home)
})

describe("design mode of a page locked for want of payment (BEELINK-296)", () => {
  it("opens the editor of an open page, as ever", async () => {
    render(await DesignPage(at()))

    expect(screen.getByText("o editor")).toBeInTheDocument()
    expect(mocks.redirect).not.toHaveBeenCalled()
  })

  it("leads to the panel's home when the owner's preview is refused for the lock", async () => {
    mocks.pagePreviewAt.mockResolvedValue("PAGE_LOCKED")

    await expect(DesignPage(at())).rejects.toThrow("NEXT_REDIRECT /admin/loja-amora")
  })

  it("leads to the panel's home when the shop's own read says it is off the air, whatever the preview says", async () => {
    mocks.shopAt.mockResolvedValue({ ...shop, unavailable: true })

    await expect(DesignPage(at({ page: "landing-id" }))).rejects.toThrow("NEXT_REDIRECT /admin/loja-amora")
    expect(mocks.redirect).toHaveBeenCalledOnce()
  })
})
