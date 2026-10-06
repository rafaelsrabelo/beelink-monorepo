// Libs
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

// Types
import type { PublicProductDetail } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { CartProvider } from "./cart-provider"
import { StorefrontProductLive } from "./storefront-product-live"
import { TrackingContext } from "./tracking/use-track"

const product = {
  id: "p1",
  slug: "blusa",
  name: "Blusa",
  priceCents: 18900,
  compareAtPriceCents: null,
  imageUrl: null,
  categorySlug: null,
  priceRange: { minCents: 18900, maxCents: 18900 },
  soldOut: true,
  description: null,
  images: [],
  category: null,
  options: [],
  variants: [{ id: "v1", optionValueIds: [], priceCents: 18900, compareAtPriceCents: null, imageUrl: null, available: false }],
} satisfies PublicProductDetail

const copy = { RESTOCK_VARIANT_INVALID: "Não está mais à venda.", BAD_REQUEST: "Número inválido.", RATE_LIMITED: "Calma.", UNKNOWN: "Algo deu errado." }

function renderLive() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <StorefrontProductLive
        slug="lessari"
        shopName="Lessari"
        homeHref="/lessari"
        product={product}
        initialVariantId={null}
        cartHref="/lessari/carrinho"
        showPrice
        showBadge
        showStock
        finishesOnWhatsApp={false}
        seller={{ name: "Lessari", paymentMethods: ["PIX"], cashback: null }}
        restockCopy={copy}
        messages={ptBR}
      />
    </QueryClientProvider>,
  )
}

async function askFor(phone: string) {
  const user = userEvent.setup()
  await user.click(screen.getByRole("button", { name: "Avise-me quando chegar" }))
  const dialog = await screen.findByRole("dialog")
  await user.type(within(dialog).getByRole("textbox", { name: "WhatsApp" }), phone)
  await user.click(within(dialog).getByRole("button", { name: "Avisar-me" }))
  return dialog
}

afterEach(() => vi.unstubAllGlobals())

describe("StorefrontProductLive — Avise-me", () => {
  it("says it failed when the request never reached the API, and never that it worked", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))))
    renderLive()

    const dialog = await askFor("11977776666")

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Algo deu errado.")
    expect(within(dialog).queryByRole("status")).toBeNull()
  })

  it("marks the number when the API refuses it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ statusCode: 400, errorCode: "BAD_REQUEST", message: "phone" }, { status: 400 })),
    )
    renderLive()

    const dialog = await askFor("123")

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Número inválido.")
    expect(within(dialog).getByRole("textbox", { name: "WhatsApp" })).toHaveAttribute("aria-invalid", "true")
  })

  it("confirms only once the API saved it, for the product's own variant", async () => {
    const fetchSpy = vi.fn(async () => new Response(null, { status: 201 }))
    vi.stubGlobal("fetch", fetchSpy)
    renderLive()

    const dialog = await askFor("11977776666")

    expect(await within(dialog).findByRole("status")).toHaveTextContent("Pronto! Avisaremos no WhatsApp.")
    const [url, init] = fetchSpy.mock.calls[0]! as unknown as [string, RequestInit]
    expect(url).toBe("/api/storefront/lessari/products/p1/restock-requests")
    expect(JSON.parse(String(init.body))).toMatchObject({ variantId: "v1", phone: "11977776666" })
  })
})

describe("StorefrontProductLive — what it tells (BEELINK-272)", () => {
  const whey = {
    ...product,
    id: "p2",
    name: "Whey",
    priceCents: 9990,
    soldOut: false,
    category: { id: "c1", slug: "proteinas", name: "Proteínas", parentSlug: null },
    variants: [{ id: "v2", optionValueIds: [], priceCents: 10990, compareAtPriceCents: null, imageUrl: null, available: true }],
  } as unknown as PublicProductDetail

  function renderTold(track: () => void) {
    return render(
      <QueryClientProvider client={new QueryClient()}>
        <TrackingContext value={{ allowed: true, track }}>
          <CartProvider slug="lessari" lines={[]}>
            <StorefrontProductLive slug="lessari" shopName="Lessari" homeHref="/lessari" product={whey} initialVariantId={null} cartHref="/lessari/carrinho" showPrice showBadge showStock finishesOnWhatsApp={false} seller={{ name: "Lessari", paymentMethods: ["PIX"], cashback: null }} restockCopy={copy} messages={ptBR} />
          </CartProvider>
        </TrackingContext>
      </QueryClientProvider>,
    )
  }

  afterEach(() => {
    document.cookie = "bl_cart=; Path=/lessari; Max-Age=0"
  })

  it("tells the product as seen, once, by its own id, with its category and price", () => {
    const track = vi.fn()
    const view = renderTold(track)
    view.rerender(<></>)

    expect(track.mock.calls).toEqual([[{ name: "ViewContent", product: { id: "p2", name: "Whey", priceCents: 9990, category: "Proteínas" } }]])
  })

  it("tells what goes into the cart by the product's id, at the price of the combination chosen", async () => {
    const track = vi.fn()
    renderTold(track)

    await userEvent.click(screen.getAllByRole("button", { name: /Adicionar ao carrinho/ })[0]!)

    expect(track.mock.calls.at(-1)).toEqual([{ name: "AddToCart", item: { productId: "p2", qty: 1, name: "Whey", unitPriceCents: 10990 } }])
  })
})
