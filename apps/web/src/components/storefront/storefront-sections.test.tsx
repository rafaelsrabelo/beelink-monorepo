// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Types
import type { ComponentSpan, PublicComponent, PublicSection } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { storefrontRoutes } from "@/lib/storefront-routes"
import { StorefrontSections } from "./storefront-sections"

const routes = storefrontRoutes({
  slug: "loja",
  routeWords: { products: "produtos", categories: "categorias", search: "busca", cart: "carrinho" },
})

function poster(id: string, span: ComponentSpan): PublicComponent {
  return {
    id,
    kind: "BANNER",
    title: null,
    subtitle: null,
    body: null,
    layout: "FULL",
    span,
    display: "CAROUSEL",
    items: [{ id: `${id}-s`, imageUrl: `https://cdn/${id}.png`, title: `Pôster ${id}`, subtitle: null, href: null, external: false }],
    columns: null,
    align: null,
  }
}

function heading(id: string, span: ComponentSpan): PublicComponent {
  return { ...poster(id, span), kind: "HEADING", title: `Título ${id}`, display: null, items: [] }
}

function band(components: PublicComponent[], width: PublicSection["width"] = "CONTAINED"): PublicSection {
  return { id: "band", name: null, width, background: null, components }
}

function draw(sections: PublicSection[]) {
  return render(
    <StorefrontSections
      sections={sections}
      // Read only when a band has a colour of its own, and none of these does.
      primary=""
      bands={[]}
      categories={[]}
      routes={routes}
      showPrice
      showBadge
      messages={ptBR}
    />,
  )
}

describe("StorefrontSections — a band is a grid", () => {
  /**
   * The defect that opened the epic: two halves in one band stacked, because the band was a column.
   * Here they are two cells of one twelve-column grid; the browser measurement is in the PR.
   */
  it("puts every component of a band in its own cell of one grid, with its own slice", () => {
    const { container } = draw([band([poster("a", "HALF"), poster("b", "HALF"), heading("c", "THIRD")])])

    const cells = [...container.querySelectorAll("[data-span]")]
    expect(cells.map((cell) => cell.getAttribute("data-span"))).toEqual(["HALF", "HALF", "THIRD"])
    expect(new Set(cells.map((cell) => cell.parentElement))).toHaveProperty("size", 1)
    expect(cells[0]!.parentElement!.className).toContain("grid-cols-12")
  })

  it("draws a poster and a heading inside their cells", () => {
    draw([band([poster("a", "TWO_THIRDS"), heading("b", "THIRD")])])

    expect(screen.getByText("Pôster a").closest("[data-span]")).toHaveAttribute("data-span", "TWO_THIRDS")
    expect(screen.getByText("Título b").closest("[data-span]")).toHaveAttribute("data-span", "THIRD")
  })

  it("lets an edge-to-edge band's blocks touch, as they did when the band stacked them", () => {
    const { container } = draw([band([poster("a", "HALF"), poster("b", "HALF")], "FULL")])

    expect(container.querySelector("[data-span]")!.parentElement!.className).toContain("gap-0")
  })

  it("leaves the strip above the header out of the band's cells", () => {
    const strip: PublicComponent = { ...heading("strip", "FULL"), kind: "ANNOUNCEMENT", title: "Frete grátis" }
    const { container } = draw([band([strip, poster("a", "FULL")])])

    expect([...container.querySelectorAll("[data-span]")]).toHaveLength(1)
  })
})
