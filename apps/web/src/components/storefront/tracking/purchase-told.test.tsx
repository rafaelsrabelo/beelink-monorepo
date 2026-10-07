// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { StorefrontConsentGate } from "../storefront-consent-gate"
import { StorefrontConsentReopen } from "../storefront-consent-reopen"
import { PurchaseTold } from "./purchase-told"
import { StorefrontTracking } from "./storefront-tracking"
import { CONSENT_COOKIE, type ConsentChoice } from "@/lib/consent-cookie"
import { purchaseOf, type Purchase, type PurchaseOrder } from "@/lib/purchase"
import { PURCHASES_COOKIE, purchasesFromCookies } from "@/lib/purchase-cookie"

vi.mock("next/navigation", () => ({ usePathname: () => window.location.pathname }))
vi.mock("next/script", () => ({ default: () => null }))

const PIXEL = "123456789012345"
const ORDER = "0b9f6c1e-5a44-4a8b-9d55-3f1f1c2a7e10"
const OTHER = "0b9f6c1e-5a44-4a8b-9d55-3f1f1c2a7e11"
const WHEY = "01a0d395-c1ab-7399-a472-000000000001"
const PLACED = "2026-10-06T12:00:00.000Z"
const colors = { background: "white", primary: "rebeccapurple", header: "navy", footer: "navy" }

const order = (id = ORDER): PurchaseOrder => ({
  id,
  status: "RECEIVED",
  placedBy: "CUSTOMER",
  paymentChannel: "OFFLINE",
  totalCents: 13490,
  deliveryFeeCents: 500,
  placedAt: PLACED,
  items: [{ productId: WHEY, quantity: 1, lineTotalCents: 12990, discountCents: 0 }],
  payment: null,
})
const bought = (id = ORDER): Purchase => purchaseOf(order(id), new Date(PLACED))!

/** A page of the shop showing an order, inside its layout: the answer, the tracking, the page. */
function shop(purchase: Purchase | null, { pixelId = PIXEL, choice = null }: { pixelId?: string | null; choice?: ConsentChoice | null } = {}) {
  return (
    <StorefrontConsentGate slug="loja-a" store={{ metaPixelId: pixelId, colors }} choice={choice} messages={ptBR}>
      <StorefrontTracking pixelId={pixelId} quietPaths={[]}>
        <PurchaseTold slug="loja-a" purchase={purchase} />
        <StorefrontConsentReopen label="Cookies" />
      </StorefrontTracking>
    </StorefrontConsentGate>
  )
}

/**
 * Everything the library was told. It "arrives" the first time a test looks: it takes what waited
 * in Meta's queue and answers every call from then on, as the real one does.
 */
let heard: unknown[][] = []
function calls(): unknown[][] {
  const fbq = window.fbq
  if (fbq && !fbq.callMethod) {
    heard.push(...fbq.queue.splice(0).map((call) => [...call]))
    fbq.callMethod = (...args) => void heard.push(args)
  }
  return heard
}
/** Every purchase the pixel was handed, with its id. */
const purchases = () => calls().filter(([command, , name]) => command === "trackSingle" && name === "Purchase").map((call) => ({ pixel: call[1], params: call[3], id: (call[4] as { eventID: string }).eventID }))
const marked = () => purchasesFromCookies(document.cookie)

beforeEach(() => window.history.replaceState(null, "", "/loja-a/conta/pedidos/12"))

afterEach(() => {
  heard = []
  delete window.fbq
  delete window._fbq
  for (const name of [CONSENT_COOKIE, PURCHASES_COOKIE]) document.cookie = `${name}=; Path=/loja-a; Max-Age=0`
})

describe("an order's purchase, told from the page that shows it", () => {
  it("tells it once, to the shop's pixel, under the order's id, with its value and what was bought", () => {
    render(shop(bought(), { choice: "granted" }))

    expect(purchases()).toEqual([
      {
        pixel: PIXEL,
        id: `purchase-${ORDER}`,
        params: { content_ids: [WHEY], content_type: "product", contents: [{ id: WHEY, quantity: 1, item_price: 129.9 }], num_items: 1, value: 134.9, currency: "BRL" },
      },
    ])
    expect(marked()).toEqual([ORDER.replaceAll("-", "")])
  })

  it("does not tell it again when the page is read again, or opened another day", () => {
    render(shop(bought(), { choice: "granted" })).unmount()
    expect(purchases()).toHaveLength(1)
    // A new load: nothing of the first is left but the cookies.
    heard = []
    delete window.fbq
    delete window._fbq

    render(shop(bought(), { choice: "granted" }))

    expect(purchases()).toEqual([])
  })

  it("does not tell it from a second tab: what was told is read at the telling, not kept from when the page opened", () => {
    // Two tabs open on the order before either told it — one browser, one cookie jar.
    const first = render(shop(null, { choice: "granted" }))
    const second = render(shop(null, { choice: "granted" }))

    first.rerender(shop(bought(), { choice: "granted" }))
    second.rerender(shop(bought(), { choice: "granted" }))

    expect(purchases()).toHaveLength(1)
  })

  it("tells another order of the same shopper, and keeps both", () => {
    const view = render(shop(bought(), { choice: "granted" }))
    view.rerender(shop(bought(OTHER), { choice: "granted" }))

    expect(purchases().map((purchase) => purchase.id)).toEqual([`purchase-${ORDER}`, `purchase-${OTHER}`])
    expect(marked()).toHaveLength(2)
  })

  it("tells it when the order becomes a purchase under the shopper's eyes — a payment confirmed", () => {
    const view = render(shop(null, { choice: "granted" }))
    expect(purchases()).toEqual([])

    view.rerender(shop(bought(), { choice: "granted" }))

    expect(purchases()).toHaveLength(1)
  })
})

describe("an order's purchase and the visitor's answer", () => {
  it.each([
    ["has not answered", { choice: null }],
    ["refused", { choice: "denied" }],
    ["said yes to a shop that has no pixel now", { choice: "granted", pixelId: null }],
  ] as const)("tells nothing, and marks nothing as told, for a buyer who %s", (_name, visit) => {
    render(shop(bought(), visit))

    expect(window.fbq).toBeUndefined()
    expect(marked()).toEqual([])
  })

  it("tells it at a yes given afterwards, on the page that shows the order — once", async () => {
    render(shop(bought()))
    expect(marked()).toEqual([])

    await userEvent.click(screen.getByRole("button", { name: "Aceitar" }))

    expect(purchases().map((purchase) => purchase.id)).toEqual([`purchase-${ORDER}`])
    expect(marked()).toHaveLength(1)
  })

  it("does not tell it a second time when the yes is taken back and given again", async () => {
    render(shop(bought(), { choice: "granted" }))
    expect(purchases()).toHaveLength(1)

    await userEvent.click(screen.getByRole("button", { name: "Cookies" }))
    await userEvent.click(screen.getByRole("button", { name: "Recusar" }))
    await userEvent.click(screen.getByRole("button", { name: "Cookies" }))
    await userEvent.click(screen.getByRole("button", { name: "Aceitar" }))

    expect(purchases()).toHaveLength(1)
  })

  it("tells nothing outside a shop's own pages: the panel and the design preview draw no tracking", () => {
    render(<PurchaseTold slug="loja-a" purchase={bought()} />)

    expect(window.fbq).toBeUndefined()
    expect(marked()).toEqual([])
  })

  it("tells nothing for an order that is no purchase: one the day has passed for", () => {
    const late = purchaseOf(order(), new Date("2026-10-08T12:00:00.000Z"))
    render(shop(late, { choice: "granted" }))

    expect(late).toBeNull()
    expect(purchases()).toEqual([])
  })
})
