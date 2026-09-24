// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Types
import type {
  ComponentDisplay,
  ComponentSpan,
  PublicBannerSlide,
  PublicComponent,
  PublicSection,
} from "@harness-monorepo/contracts"

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

function banner(id: string, display: ComponentDisplay, pictures: number): PublicComponent {
  return {
    ...poster(id, "FULL"),
    display,
    items: Array.from({ length: pictures }, (_, at) => ({
      id: `${id}-${at}`,
      imageUrl: `https://cdn/${id}-${at}.png`,
      title: `${id} ${at + 1}`,
      subtitle: null,
      href: null,
      external: false,
    })),
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

  /**
   * Stacked blocks in an edge-to-edge band touched when the band was a column; posters side by side
   * always had 16px between them. Both stay true.
   */
  it("keeps side-by-side blocks apart in an edge-to-edge band, and stacked ones touching", () => {
    const { container } = draw([band([poster("a", "HALF"), poster("b", "HALF")], "FULL")])

    const grid = container.querySelector("[data-span]")!.parentElement!.className.split(" ")
    expect(grid).toContain("gap-x-4")
    expect(grid).not.toContain("gap-y-8")
  })

  it("leaves the strip above the header out of the band's cells", () => {
    const strip: PublicComponent = { ...heading("strip", "FULL"), kind: "ANNOUNCEMENT", title: "Frete grátis" }
    const { container } = draw([band([strip, poster("a", "FULL")])])

    expect([...container.querySelectorAll("[data-span]")]).toHaveLength(1)
  })
})

/**
 * The count used to be the whole decision: a second picture made a carousel, whatever anyone
 * wanted. The shopkeeper's display decides now, and the count only says how many cards there are.
 */
describe("StorefrontSections — a banner is a carousel or a grid by choice", () => {
  it("lays three pictures side by side when the banner is a grid, and draws no carousel", () => {
    const { container } = draw([band([banner("grade", "GRID", 3)])])

    const cell = container.querySelector("[data-span]")!
    expect(["grade 1", "grade 2", "grade 3"].map((title) => screen.getByText(title).closest("[data-span]"))).toEqual([
      cell,
      cell,
      cell,
    ])
    expect(cell.querySelector("ul")!.className).toContain("@3xl:grid-cols-3")
    expect(screen.queryByRole("button", { name: "Anterior" })).not.toBeInTheDocument()
  })

  it("keeps a carousel a carousel, however many pictures it holds", () => {
    draw([band([banner("roda", "CAROUSEL", 3)])])

    expect(screen.getByRole("button", { name: "Anterior" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Próximos" })).toBeInTheDocument()
  })

  /**
   * The card, not the cover: a banner of one picture sits in its slice at the slice's proportion,
   * where the hero would stand at a full band's fixed height whatever the cell.
   */
  it("draws the one card for a banner of one picture, whichever it is", () => {
    const { container } = draw([band([banner("so-carrossel", "CAROUSEL", 1), banner("so-grade", "GRID", 1)])])

    for (const cell of container.querySelectorAll("[data-span]")) {
      expect(cell.querySelectorAll("ul > li")).toHaveLength(1)
      expect(cell.querySelector("img")!.className).not.toContain("h-44")
    }
    expect(screen.queryByRole("button", { name: "Anterior" })).not.toBeInTheDocument()
  })

  it("names a grid card whose words are painted into the picture, as the carousel does", () => {
    const grid = banner("mudo", "GRID", 2)
    const slides = (grid.items as PublicBannerSlide[]).map((slide) => ({ ...slide, title: null, href: "/loja/produtos/p" }))
    draw([band([{ ...grid, items: slides }])])

    for (const link of screen.getAllByRole("link")) expect(link).toHaveAccessibleName("Voltar para a loja")
  })
})
