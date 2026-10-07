// Node
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { StrictMode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { StorefrontConsentGate } from "../storefront-consent-gate"
import { StorefrontConsentReopen } from "../storefront-consent-reopen"
import { StorefrontTracking } from "./storefront-tracking"
import { TrackView } from "./track-view"
import { useTrack } from "./use-track"
import { CONSENT_COOKIE, type ConsentChoice } from "@/lib/consent-cookie"

const mocks = vi.hoisted(() => ({ pathname: "/loja-a" }))

vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname }))
vi.mock("next/script", () => ({ default: () => null }))

const PIXEL = "123456789012345"
const colors = { background: "white", primary: "rebeccapurple", header: "navy", footer: "navy" }
const HAZE = { id: "p-1", name: "Haze", priceCents: 12990, category: null }

interface Shop {
  pixelId: string | null
  choice?: ConsentChoice | null
  /** Whether the shop's funnel is counted for this browser; the layout decides. */
  counted?: boolean
}

function Buy() {
  const track = useTrack()

  return <button onClick={() => track({ name: "AddToCart", item: { productId: HAZE.id, name: HAZE.name, unitPriceCents: HAZE.priceCents, qty: 1 } })}>Comprar</button>
}

const productPage = <TrackView event={{ name: "ViewContent", product: HAZE }} viewKey={HAZE.id} />

/** A shop's layout as `app/[slug]/layout.tsx` draws it. */
function shop({ pixelId, choice = null, counted = true }: Shop, page = productPage) {
  return (
    <StorefrontConsentGate slug="loja-a" store={{ metaPixelId: pixelId, colors }} choice={choice} messages={ptBR}>
      <StorefrontTracking pixelId={pixelId} quietPaths={["/loja-a/redefinir-senha"]} countAt={counted ? "loja-a" : null}>
        {page}
        <Buy />
        <StorefrontConsentReopen label="Cookies" />
      </StorefrontTracking>
    </StorefrontConsentGate>
  )
}

const fetched = vi.fn(async (_url: string, _init?: RequestInit) => new Response(null, { status: 204 }))
/** Every count that left, as the step named in its body. */
const counts = () => fetched.mock.calls.map(([url, init]) => `${url} · ${(JSON.parse(String(init?.body)) as { step: string }).step}`)
const A = (step: string) => `/loja-a/api/funnel · ${step}`
const metaEvents = () => (window.fbq?.queue ?? []).filter(([command]) => command === "trackSingle").map(([, , name]) => name)

function at(pathname: string) {
  mocks.pathname = pathname
  window.history.replaceState(null, "", pathname)
}

beforeEach(() => {
  at("/loja-a/produto/haze")
  vi.stubGlobal("fetch", fetched)
})

afterEach(() => {
  fetched.mockClear()
  vi.unstubAllGlobals()
  delete window.fbq
  delete window._fbq
  document.cookie = `${CONSENT_COOKIE}=; Path=/loja-a; Max-Age=0`
})

describe("the shop's funnel, counted whatever the answer about cookies (BEELINK-276)", () => {
  it.each([
    ["a shop with no pixel", { pixelId: null }],
    ["a visitor who has not answered", { pixelId: PIXEL, choice: null }],
    ["a visitor who refused", { pixelId: PIXEL, choice: "denied" }],
    ["a visitor who said yes", { pixelId: PIXEL, choice: "granted" }],
  ] as const)("counts the page, the product and the addition to the cart for %s", async (_who, visit) => {
    render(shop(visit))
    await userEvent.click(screen.getByRole("button", { name: "Comprar" }))

    expect(counts()).toEqual([A("PAGE_VIEW"), A("PRODUCT_VIEW"), A("ADD_TO_CART")])
  })

  it("sends Meta nothing by counting: no pixel and a refusal leave no trace of it on the page", async () => {
    render(shop({ pixelId: PIXEL, choice: "denied" }))
    await userEvent.click(screen.getByRole("button", { name: "Comprar" }))

    expect(counts()).toHaveLength(3)
    expect(window.fbq).toBeUndefined()
  })

  it("counts the page once when the yes is given on it — the pixel is told where the visitor is, the funnel already knew", async () => {
    render(shop({ pixelId: PIXEL }))
    expect(counts()).toEqual([A("PAGE_VIEW"), A("PRODUCT_VIEW")])

    await userEvent.click(screen.getByRole("button", { name: "Aceitar" }))

    expect(metaEvents()).toEqual(["PageView", "ViewContent"])
    expect(counts()).toEqual([A("PAGE_VIEW"), A("PRODUCT_VIEW")])
  })

  it("counts nothing more when the yes is taken back, and given again", async () => {
    render(shop({ pixelId: PIXEL, choice: "granted" }))

    await userEvent.click(screen.getByRole("button", { name: "Cookies" }))
    await userEvent.click(screen.getByRole("button", { name: "Recusar" }))
    await userEvent.click(screen.getByRole("button", { name: "Cookies" }))
    await userEvent.click(screen.getByRole("button", { name: "Aceitar" }))

    expect(counts()).toEqual([A("PAGE_VIEW"), A("PRODUCT_VIEW")])
  })

  it("counts once with every effect run twice, as in development", () => {
    render(<StrictMode>{shop({ pixelId: null })}</StrictMode>)

    expect(counts()).toEqual([A("PAGE_VIEW"), A("PRODUCT_VIEW")])
  })

  it("counts one page per path: a filter is the same page, another path is another", () => {
    at("/loja-a")
    const view = render(shop({ pixelId: null }, <p>início</p>))
    view.rerender(shop({ pixelId: null }, <p>início, filtrado</p>))
    expect(counts()).toEqual([A("PAGE_VIEW")])

    at("/loja-a/produtos")
    view.rerender(shop({ pixelId: null }, <p>produtos</p>))
    expect(counts()).toEqual([A("PAGE_VIEW"), A("PAGE_VIEW")])
  })

  it("counts the checkout begun once, and a search not at all", () => {
    at("/loja-a/carrinho")
    const checkout = <TrackView event={{ name: "InitiateCheckout", items: [], valueCents: 100 }} viewKey="checkout" />
    const view = render(shop({ pixelId: null }, checkout))
    view.rerender(shop({ pixelId: null }, checkout))
    expect(counts()).toEqual([A("PAGE_VIEW"), A("CHECKOUT_START")])

    at("/loja-a/busca")
    view.rerender(shop({ pixelId: null }, <TrackView event={{ name: "Search", term: "whey" }} viewKey="whey" />))
    expect(counts().slice(2)).toEqual([A("PAGE_VIEW")])
  })
})

describe("the shop's funnel, where nothing is counted", () => {
  it("counts nothing from a page whose address carries a token", () => {
    at("/loja-a/redefinir-senha")
    render(shop({ pixelId: PIXEL, choice: "granted" }))

    expect(fetched).not.toHaveBeenCalled()
  })

  it("counts nothing where the layout says not to — a site that sells nothing, a shopkeeper's browser", async () => {
    render(shop({ pixelId: PIXEL, choice: "granted", counted: false }))
    await userEvent.click(screen.getByRole("button", { name: "Comprar" }))

    expect(fetched).not.toHaveBeenCalled()
    // The pixel's path is its own: it is told as before.
    expect(metaEvents()).toEqual(["PageView", "ViewContent", "AddToCart"])
  })

  it("counts nothing outside a shop's layout — the panel and the design preview draw the same blocks", async () => {
    render(
      <>
        {productPage}
        <Buy />
      </>,
    )
    await userEvent.click(screen.getByRole("button", { name: "Comprar" }))

    expect(fetched).not.toHaveBeenCalled()
  })

  const src = join(process.cwd(), "src")
  const sources = (readdirSync(src, { recursive: true }) as string[]).filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file)).map((file) => ({ file, text: readFileSync(join(src, file), "utf8") }))

  it("is sent from one function, mounted by one component: nothing else names the counting route", () => {
    expect(sources.filter(({ text }) => /sendFunnelStep\(|createFunnelCounter\(/.test(text) && !/export function (sendFunnelStep|createFunnelCounter)/.test(text)).map(({ file }) => file)).toEqual(["components/storefront/tracking/storefront-tracking.tsx"])
    expect(sources.filter(({ text }) => text.includes("/api/funnel`")).map(({ file }) => file)).toEqual(["lib/funnel-count.ts"])
  })

  it("writes no cookie and reads none in the browser to count", () => {
    const counter = sources.find(({ file }) => file === "lib/funnel-count.ts")!.text

    // Spelled in pieces: the web-storage gate reads every file for the two names.
    expect(counter).not.toMatch(new RegExp(["document\\.cookie", "local" + "Storage", "session" + "Storage", "navigator\\.sendBeacon\\("].join("|")))
    expect(counter).toMatch(/credentials: "omit"/)
  })
})
