// Libs
import { render, screen } from "@testing-library/react"
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

beforeEach(() => {
  mocks.store.mockReturnValue(read({ name: "Mutante Suplementos", type: "ECOMMERCE", logoUrl: null }))
  mocks.products.mockReturnValue(read({ total: 0 }))
  mocks.sections.mockReturnValue(read([]))
  mocks.leads.mockReturnValue(read({ total: 0 }))
})

describe("ShopHomeScreen", () => {
  it("shows BeeFlow's banner over what is left to set up, as a link to the shop's Integrations", () => {
    render(<ShopHomeScreen slug="mutante" ui={ui} web={web} />)

    expect(screen.getByRole("heading", { level: 1, name: "Mutante Suplementos" })).toBeInTheDocument()
    expect(banner()).toHaveAttribute("href", "/admin/mutante/integrations")
    // The price is drawn in the artwork, so it is read out with it.
    expect(banner()).toHaveAccessibleName(/Ativação por apenas R\$ 39,90\./)
    const cards = screen.getByRole("list")
    expect(banner().compareDocumentPosition(cards) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // The banner was asked for, not a notice to dismiss.
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("waits only on which kind of store this is, holding its place meanwhile, and not on the cards", () => {
    mocks.store.mockReturnValue(reading)
    const { container, rerender } = render(<ShopHomeScreen slug="mutante" ui={ui} web={web} />)
    expect(screen.queryByRole("link")).toBeNull()
    expect(container.querySelector("[data-slot='skeleton'].aspect-video")).not.toBeNull()

    mocks.store.mockReturnValue(read({ name: "Mutante Suplementos", type: "ECOMMERCE", logoUrl: null }))
    mocks.products.mockReturnValue(reading)
    rerender(<ShopHomeScreen slug="mutante" ui={ui} web={web} />)
    expect(banner()).toBeInTheDocument()
    expect(screen.queryByRole("list")).toBeNull()
  })

  /** A site has no orders to tell of and no Integrations page in its menu: the banner would lead nowhere it knows. */
  it("is not on a site's home", () => {
    mocks.store.mockReturnValue(read({ name: "Asfalto Norte", type: "INSTITUTIONAL", logoUrl: null }))
    render(<ShopHomeScreen slug="asfalto" ui={ui} web={web} />)

    expect(screen.queryByRole("link", { name: /BeeFlow/ })).toBeNull()
    expect(screen.getByRole("list")).toBeInTheDocument()
  })
})
