// Libs
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { FavoritesProvider } from "./favorites-provider"
import { StorefrontFavoriteLive } from "./storefront-favorite-live"
import { TrackingContext } from "../tracking/use-track"

const mocks = vi.hoisted(() => ({ search: "", replace: vi.fn(), track: vi.fn() }))
vi.mock("next/navigation", () => ({
  usePathname: () => "/loja/produtos/haze",
  useSearchParams: () => new URLSearchParams(mocks.search),
  useRouter: () => ({ replace: mocks.replace }),
}))

const HAZE = "01a0d395-c1ab-7399-a472-000000000001"
const WHEY = "01a0d395-c1ab-7399-a472-000000000002"

/** A shop's pages, where what happens is told: the events land in `mocks.track`. */
function Told({ children }: { children: ReactNode }) {
  return <TrackingContext value={{ allowed: true, track: mocks.track }}>{children}</TrackingContext>
}

function renderInShop(children: ReactNode, signedIn = true) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <FavoritesProvider slug="loja" signedIn={signedIn} signInPath="/loja/entrar" favoritesHref="/loja/conta/favoritos" messages={ptBR}>
        {children}
      </FavoritesProvider>
    </QueryClientProvider>,
    { wrapper: Told },
  )
}

type Fetched = (url: string, init?: RequestInit) => Promise<Response>

beforeEach(() => {
  mocks.search = ""
  mocks.replace.mockReset()
  mocks.track.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("the heart on a shop's pages", () => {
  it("draws nothing outside a shop, where no one is looking — the panel's previews", () => {
    const { container } = render(<StorefrontFavoriteLive productId={HAZE} productName="Haze" messages={ptBR} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("sends a visitor to sign in, back to this page with the product and its combination to like", () => {
    mocks.search = "variant=v-2"
    renderInShop(<StorefrontFavoriteLive productId={HAZE} productName="Haze" variantId="v-2" messages={ptBR} />, false)

    const href = new URL(screen.getByRole("link", { name: "Entre para curtir Haze" }).getAttribute("href") ?? "", "http://x")
    expect(href.pathname).toBe("/loja/entrar")
    const back = new URL(href.searchParams.get("voltar") ?? "", "http://x")
    expect(back.pathname).toBe("/loja/produtos/haze")
    expect(Object.fromEntries(back.searchParams)).toEqual({ variant: "v-2", curtir: HAZE, "curtir-variante": "v-2" })
  })

  it("is pressed for a product the shopper liked, and turns at the press", async () => {
    // The API as it answers: the ids read again after the press include the product liked.
    const liked = new Set([WHEY])
    const fetched = vi.fn<Fetched>(async (url) => {
      if (String(url).endsWith("/ids")) return Response.json({ productIds: [...liked] })
      liked.add(String(url).split("/").at(-1) ?? "")
      return new Response(null, { status: 204 })
    })
    vi.stubGlobal("fetch", fetched)
    renderInShop(
      <>
        <StorefrontFavoriteLive productId={HAZE} productName="Haze" variantId="v-1" messages={ptBR} />
        <StorefrontFavoriteLive productId={WHEY} productName="Whey" messages={ptBR} />
      </>,
    )

    await waitFor(() => expect(screen.getByRole("button", { name: "Curtir Whey" })).toHaveAttribute("aria-pressed", "true"))
    const haze = screen.getByRole("button", { name: "Curtir Haze" })
    expect(haze).toHaveAttribute("aria-pressed", "false")

    await userEvent.click(haze)
    await waitFor(() => expect(haze).toHaveAttribute("aria-pressed", "true"))
    const like = fetched.mock.calls.find(([, init]) => init?.method === "PUT")
    expect(String(like?.[0])).toBe(`/loja/api/favorites/${HAZE}`)
    expect(JSON.parse(String(like?.[1]?.body))).toEqual({ variantId: "v-1" })
  })

  it("turns back when the shop refuses, and says the cap with the way to the favourites", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<Fetched>(async (url) =>
        String(url).endsWith("/ids") ? Response.json({ productIds: [] }) : Response.json({ errorCode: "CUSTOMER_FAVORITE_LIMIT" }, { status: 409 }),
      ),
    )
    renderInShop(<StorefrontFavoriteLive productId={HAZE} productName="Haze" messages={ptBR} />)

    const heart = await screen.findByRole("button", { name: "Curtir Haze" })
    await waitFor(() => expect(heart).toBeEnabled())
    await userEvent.click(heart)

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Você já tem 200 favoritos, o máximo."))
    expect(heart).toHaveAttribute("aria-pressed", "false")
    expect(screen.getByRole("link", { name: "Ver favoritos" })).toHaveAttribute("href", "/loja/conta/favoritos")
  })

  it("likes the product a visitor pressed once they are back signed in, and clears it from the address", async () => {
    mocks.search = `variant=v-2&curtir=${HAZE}&curtir-variante=v-2`
    const fetched = vi.fn<Fetched>(async (url) => (String(url).endsWith("/ids") ? Response.json({ productIds: [] }) : new Response(null, { status: 204 })))
    vi.stubGlobal("fetch", fetched)

    renderInShop(null)

    await waitFor(() => expect(fetched.mock.calls.some(([, init]) => init?.method === "PUT")).toBe(true))
    const like = fetched.mock.calls.find(([, init]) => init?.method === "PUT")
    expect(String(like?.[0])).toBe(`/loja/api/favorites/${HAZE}`)
    expect(JSON.parse(String(like?.[1]?.body))).toEqual({ variantId: "v-2" })
    expect(mocks.replace).toHaveBeenCalledWith("/loja/produtos/haze?variant=v-2", { scroll: false })
  })

  it("tells a like once the shop kept it, with the product and its price — and never a heart turned off (BEELINK-272)", async () => {
    const liked = new Set<string>()
    const fetched = vi.fn<Fetched>(async (url, init) => {
      if (String(url).endsWith("/ids")) return Response.json({ productIds: [...liked] })
      if (init?.method === "PUT") liked.add(HAZE)
      else liked.delete(HAZE)
      return new Response(null, { status: 204 })
    })
    vi.stubGlobal("fetch", fetched)
    renderInShop(<StorefrontFavoriteLive productId={HAZE} productName="Haze" priceCents={12990} messages={ptBR} />)
    const heart = await screen.findByRole("button", { name: "Curtir Haze" })
    await waitFor(() => expect(heart).toBeEnabled())

    await userEvent.click(heart)
    await waitFor(() => expect(mocks.track).toHaveBeenCalledTimes(1))
    expect(mocks.track).toHaveBeenCalledWith({ name: "AddToWishlist", product: { id: HAZE, name: "Haze", priceCents: 12990 } })

    await waitFor(() => expect(fetched.mock.calls.filter(([url]) => String(url).endsWith("/ids")).length).toBeGreaterThan(1))
    await userEvent.click(heart)
    await waitFor(() => expect(fetched.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(true))
    expect(mocks.track).toHaveBeenCalledTimes(1)
  })

  it("tells nothing of a like the shop refused", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<Fetched>(async (url) => (String(url).endsWith("/ids") ? Response.json({ productIds: [] }) : Response.json({ errorCode: "CUSTOMER_FAVORITE_LIMIT" }, { status: 409 }))),
    )
    renderInShop(<StorefrontFavoriteLive productId={HAZE} productName="Haze" messages={ptBR} />)
    const heart = await screen.findByRole("button", { name: "Curtir Haze" })
    await waitFor(() => expect(heart).toBeEnabled())

    await userEvent.click(heart)

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Você já tem 200 favoritos, o máximo."))
    expect(mocks.track).not.toHaveBeenCalled()
  })

  it("tells the like made on the way back from signing in, by the product alone", async () => {
    mocks.search = `curtir=${HAZE}`
    vi.stubGlobal("fetch", vi.fn<Fetched>(async (url) => (String(url).endsWith("/ids") ? Response.json({ productIds: [] }) : new Response(null, { status: 204 }))))
    renderInShop(null)

    await waitFor(() => expect(mocks.track).toHaveBeenCalledWith({ name: "AddToWishlist", product: { id: HAZE } }))
  })
})
