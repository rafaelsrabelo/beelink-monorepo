// Libs
import { render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { ptBR as web } from "@/locales/pt-BR"
import { ShopHomeScreen } from "./shop-home-screen"

const mocks = vi.hoisted(() => ({ store: vi.fn(), products: vi.fn(), sections: vi.fn(), leads: vi.fn() }))
vi.mock("@/services/stores/store-hooks", () => ({ useStore: mocks.store }))
vi.mock("@/services/catalog/catalog-hooks", () => ({ useProducts: mocks.products }))
vi.mock("@/services/page/page-hooks", () => ({ useSections: mocks.sections }))
vi.mock("@/services/leads/lead-hooks", () => ({ useLeads: mocks.leads }))
// The app's image component is Next's, which a test has no loader for: the artwork is its `alt` here.
vi.mock("@/components/landing/brand-photo", () => ({ BrandPhoto: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} /> }))

const read = (data: object) => ({ isPending: false, isError: false, data })
const reading = { isPending: true, isError: false }
const banner = () => screen.getByRole("link", { name: /Conheça o BeeFlow em Integrações$/ })
const shop = (customDomain: { host: string; status: "PENDING" | "ACTIVE" } | null) => read({ name: "Mutante Suplementos", type: "ECOMMERCE", logoUrl: null, customDomain })
/** The home's cards, each as its heading; and one of them by its heading. */
const cardTitles = () => within(screen.getByRole("list")).getAllByRole("heading", { level: 3 }).map((title) => title.textContent)
const cardOf = (title: string) => screen.getByRole("heading", { level: 3, name: title }).closest("li")!

beforeEach(() => {
  mocks.store.mockReturnValue(read({ name: "Mutante Suplementos", type: "ECOMMERCE", logoUrl: null }))
  mocks.products.mockReturnValue(read({ total: 0 }))
  mocks.sections.mockReturnValue(read([]))
  mocks.leads.mockReturnValue(read({ total: 0 }))
})

describe("ShopHomeScreen", () => {
  it("shows BeeFlow's banner over what is left to set up, as a link to the shop's Integrations", () => {
    render(<ShopHomeScreen slug="mutante" address="beelink.biz/mutante" ui={ui} web={web} />)

    expect(screen.getByRole("heading", { level: 1, name: "Mutante Suplementos" })).toBeInTheDocument()
    expect(banner()).toHaveAttribute("href", "/admin/mutante/integrations")
    // What the artwork draws is read out with it.
    expect(banner()).toHaveAccessibleName(/Beelink no WhatsApp/)
    const cards = screen.getByRole("list")
    expect(banner().compareDocumentPosition(cards) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // The banner was asked for, not a notice to dismiss.
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("waits only on which kind of store this is, holding its place meanwhile, and not on the cards", () => {
    mocks.store.mockReturnValue(reading)
    const { container, rerender } = render(<ShopHomeScreen slug="mutante" address="beelink.biz/mutante" ui={ui} web={web} />)
    expect(screen.queryByRole("link")).toBeNull()
    expect(container.querySelector("[data-slot='skeleton'][class*='aspect-[2103/748]'].max-h-80")).not.toBeNull()

    mocks.store.mockReturnValue(read({ name: "Mutante Suplementos", type: "ECOMMERCE", logoUrl: null }))
    mocks.products.mockReturnValue(reading)
    rerender(<ShopHomeScreen slug="mutante" address="beelink.biz/mutante" ui={ui} web={web} />)
    expect(banner()).toBeInTheDocument()
    expect(screen.queryByRole("list")).toBeNull()
  })

  /** A site has no orders to tell of and no Integrations page in its menu: the banner would lead nowhere it knows. */
  it("is not on a site's home", () => {
    mocks.store.mockReturnValue(read({ name: "Asfalto Norte", type: "INSTITUTIONAL", logoUrl: null }))
    render(<ShopHomeScreen slug="asfalto" address="beelink.biz/asfalto" ui={ui} web={web} />)

    expect(screen.queryByRole("link", { name: /BeeFlow/ })).toBeNull()
    expect(screen.getByRole("list")).toBeInTheDocument()
  })
})

describe("ShopHomeScreen, the shop's address (BEELINK-285)", () => {
  it("says the address the shop has and calls for a domain of its own, last among the cards, while there is none", () => {
    mocks.store.mockReturnValue(shop(null))
    render(<ShopHomeScreen slug="mutante" address="beelink.biz/mutante" ui={ui} web={web} />)

    expect(cardTitles()).toHaveLength(6)
    expect(cardTitles().at(-1)).toBe("Aponte para o seu domínio")
    const card = within(cardOf("Aponte para o seu domínio"))
    expect(card.getByText(/^O endereço da sua página hoje é beelink\.biz\/mutante\./)).toBeInTheDocument()
    expect(card.getByRole("link", { name: /Configurar domínio/ })).toHaveAttribute("href", "/admin/mutante/domain")
    expect(card.queryByText("Feito")).toBeNull()
  })

  it("is waiting on a domain saved and not active yet", () => {
    mocks.store.mockReturnValue(shop({ host: "mutantesuplementos.com.br", status: "PENDING" }))
    render(<ShopHomeScreen slug="mutante" address="beelink.biz/mutante" ui={ui} web={web} />)

    const card = within(cardOf("Domínio próprio"))
    expect(card.getByText("Aguardando")).toBeInTheDocument()
    expect(card.getByText(/^mutantesuplementos\.com\.br ainda não abre a sua página.+segue sendo beelink\.biz\/mutante\.$/)).toBeInTheDocument()
    expect(card.getByRole("link", { name: /Ver o que falta/ })).toHaveAttribute("href", "/admin/mutante/domain")
  })

  /**
   * The domain shown is the host the API told. Nothing here builds an address to go to: "ver a
   * loja" keeps the platform's path, which the proxy leads on to the domain (BEELINK-283).
   */
  it("says an active domain as the shop's address, done, and leaves the way to the shop window as it was", () => {
    mocks.store.mockReturnValue(shop({ host: "mutantesuplementos.com.br", status: "ACTIVE" }))
    render(<ShopHomeScreen slug="mutante" address="beelink.biz/mutante" ui={ui} web={web} />)

    const card = within(cardOf("Domínio próprio"))
    expect(card.getByText("Feito")).toBeInTheDocument()
    expect(card.getByText("O endereço da sua página é mutantesuplementos.com.br.")).toBeInTheDocument()
    expect(card.getByRole("link", { name: /Gerenciar domínio/ })).toHaveAttribute("href", "/admin/mutante/domain")

    const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href"))
    expect(hrefs).toContain("/mutante")
    expect(hrefs.filter((href) => href?.includes("mutantesuplementos.com.br"))).toEqual([])
  })

  /** A site takes a domain as a shop does, and its home is the four cards of its own plus this one. */
  it("is on a site's home too, after the site's own cards", () => {
    mocks.store.mockReturnValue(read({ name: "Asfalto Norte", type: "INSTITUTIONAL", logoUrl: null, customDomain: { host: "asfaltonorte.com.br", status: "ACTIVE" } }))
    render(<ShopHomeScreen slug="asfalto" address="beelink.biz/asfalto" ui={ui} web={web} />)

    expect(cardTitles()).toHaveLength(5)
    expect(cardTitles().at(-1)).toBe("Domínio próprio")
    expect(within(cardOf("Domínio próprio")).getByText("O endereço da sua página é asfaltonorte.com.br.")).toBeInTheDocument()
  })

  /** An answer of the store's kept from before the domain existed has no such field: it reads as no domain. */
  it("reads a store's record with no word of a domain as a shop with none", () => {
    render(<ShopHomeScreen slug="mutante" address="beelink.biz/mutante" ui={ui} web={web} />)

    expect(cardTitles().at(-1)).toBe("Aponte para o seu domínio")
  })

  it("holds a place for the card while the home's cards are read", () => {
    mocks.products.mockReturnValue(reading)
    const { container } = render(<ShopHomeScreen slug="mutante" address="beelink.biz/mutante" ui={ui} web={web} />)

    expect(screen.queryByRole("list")).toBeNull()
    expect(container.querySelectorAll("[data-slot='skeleton'].h-44")).toHaveLength(4)
  })
})
