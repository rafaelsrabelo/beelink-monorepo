// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Types
import type { PublicStore } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { GalleryPreview } from "./gallery-preview"

const store = {
  slug: "loja",
  routeWords: { products: "produtos", categories: "categorias", search: "busca", cart: "carrinho", signIn: "entrar", account: "conta" },
  layoutSettings: {},
  sections: [],
} as unknown as PublicStore
const colors = { background: "oklch(0.98 0 0)", primary: "oklch(0.5 0.2 150)", header: "oklch(0.3 0 0)", footer: "oklch(0.2 0 0)" } as PublicStore["colors"]
const empty = { images: [], products: [], hasCategories: false }

describe("GalleryPreview", () => {
  // The shop's own renderer, in its own palette: what is chosen is what arrives.
  it("draws the section the way the shop window does", () => {
    render(
      <GalleryPreview
        entry={{ kind: "HEADING", across: 1, name: "Título", hint: "" }}
        store={store}
        categories={[]}
        stock={empty}
        colors={colors}
        messages={ptBR}
      />,
    )

    expect(screen.getByText("Novidades da semana")).toBeInTheDocument()
    expect(document.querySelector("[data-shop-window]")).not.toBeNull()
  })

  it("draws the strip for the strip", () => {
    render(
      <GalleryPreview entry={{ kind: "ANNOUNCEMENT", across: 1, name: "", hint: "" }} store={store} categories={[]} stock={empty} colors={colors} messages={ptBR} />,
    )

    expect(screen.getAllByText("Frete grátis nas compras acima de R$ 199").length).toBeGreaterThan(0)
  })

  it("draws nothing where the shop has nothing to show it with, so the card keeps its wireframe", () => {
    const { container } = render(
      <GalleryPreview entry={{ kind: "BANNER", across: 1, name: "", hint: "" }} store={store} categories={[]} stock={empty} colors={colors} messages={ptBR} />,
    )

    expect(container).toBeEmptyDOMElement()
  })
})
