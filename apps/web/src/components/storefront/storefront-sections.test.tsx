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
  routeWords: { products: "produtos", categories: "categorias", search: "busca", cart: "carrinho", signIn: "entrar", account: "conta" },
})

function poster(id: string, span: ComponentSpan): PublicComponent {
  return {
    id,
    kind: "BANNER",
    title: null,
    subtitle: null,
    body: null,
    span,
    display: "CAROUSEL",
    source: null,
    sourceCategory: null,
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

  // Stacked, they used to touch, and a phone drew two banners as one.
  it("keeps 16px between the blocks of an edge-to-edge band, side by side and stacked", () => {
    const { container } = draw([band([poster("a", "HALF"), poster("b", "HALF")], "FULL")])

    const grid = container.querySelector("[data-span]")!.parentElement!.className.split(" ")
    expect(grid).toContain("gap-4")
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

describe("StorefrontSections — a showcase draws its own products", () => {
  const card = (slug: string) => ({
    id: slug,
    slug,
    name: `Produto ${slug}`,
    priceCents: 1000,
    compareAtPriceCents: null,
    imageUrl: null,
    categorySlug: null,
    priceRange: { minCents: 1000, maxCents: 1000 },
  })

  function showcase(over: Partial<PublicComponent> = {}): PublicComponent {
    return {
      ...poster("vitrine", "FULL"),
      kind: "PRODUCTS",
      display: "RAIL",
      source: "ALL",
      items: [card("a"), card("b")],
      ...over,
    }
  }

  it("runs a rail sideways, named after the catalogue, with a way through to it", () => {
    draw([band([showcase()])])

    expect(screen.getByRole("group", { name: "Todos os produtos" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ver tudo em Todos os produtos" })).toHaveAttribute("href", routes.catalog())
  })

  it("lays a grid in rows, as many across as the shopkeeper chose where there is room", () => {
    const { container } = draw([band([showcase({ display: "GRID", columns: 3, title: "Destaques" })])])
    const grid = container.querySelector("ul")!.className

    expect(screen.queryByRole("group")).not.toBeInTheDocument()
    expect(grid).toContain("@xl:grid-cols-3")
    expect(grid).not.toContain("@3xl:grid-cols-4")
    expect(screen.getAllByRole("listitem")).toHaveLength(2)
  })

  it("lays four across where there is room when the shopkeeper left the count to the grid", () => {
    const { container } = draw([band([showcase({ display: "GRID", columns: null })])])
    const grid = container.querySelector("ul")!.className

    expect(grid).toContain("@3xl:grid-cols-4")
    expect(grid).not.toContain("@5xl:grid-cols-5")
  })

  const blusas = { slug: "blusas", name: "Blusas", description: "Peças leves para o calor" }

  // Named by its category unless the shopkeeper named it, and "ver tudo" goes where the rest is.
  it("titles a category showcase by its category, with its line, and leads to it", () => {
    draw([band([showcase({ source: "CATEGORY", sourceCategory: blusas })])])

    expect(screen.getByRole("heading", { name: "Blusas" })).toBeInTheDocument()
    expect(screen.getByText("Peças leves para o calor")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ver tudo em Blusas" })).toHaveAttribute("href", routes.category("blusas"))
  })

  // A hand-picked shelf headed "Todos os produtos" would be a heading that lies about it.
  it("heads an untitled showcase by what its source draws", () => {
    draw([
      band([
        showcase({ id: "a", source: "NEWEST" }),
        showcase({ id: "b", source: "ON_SALE" }),
        showcase({ id: "c", source: "SELECTION" }),
      ]),
    ])

    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual([
      "Lançamentos",
      "Promoções",
      "Destaques",
    ])
  })

  it("keeps the shopkeeper's own title over the category's name", () => {
    draw([band([showcase({ title: "Escolhas da semana", source: "CATEGORY", sourceCategory: blusas })])])

    expect(screen.getByRole("heading", { name: "Escolhas da semana" })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Blusas" })).not.toBeInTheDocument()
  })

  // Not even its band: an empty band would spend the page's 32px on a gap.
  it("draws nothing for a showcase whose source has nothing on the shelf", () => {
    const { container } = draw([band([showcase({ items: [] })])])

    expect(container.querySelector("[data-span]")).toBeNull()
  })
})

describe("StorefrontSections — the categories are a rail or a grid", () => {
  const blusas = {
    id: "c1",
    slug: "blusas",
    name: "Blusas",
    description: null,
    imageUrl: null,
    parentSlug: null,
    productCount: 3,
  }

  function categoriesBlock(over: Partial<PublicComponent> = {}): PublicComponent {
    return { ...poster("categorias", "FULL"), kind: "CATEGORIES", title: "Categorias", display: "RAIL", items: [], ...over }
  }

  function drawWith(component: PublicComponent) {
    return render(
      <StorefrontSections
        sections={[band([component])]}
        primary=""
        categories={[blusas]}
        routes={routes}
        showPrice
        showBadge
        messages={ptBR}
      />,
    )
  }

  it("runs them on a rail named after the block", () => {
    drawWith(categoriesBlock())

    expect(screen.getByRole("group", { name: "Categorias" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Blusas/ })).toHaveAttribute("href", routes.category("blusas"))
  })

  // The editor offered two to six and the grid used to drop the choice on the way.
  it("lays a grid with the columns the shopkeeper chose", () => {
    const { container } = drawWith(categoriesBlock({ display: "GRID", columns: 5 }))

    expect(screen.queryByRole("group")).not.toBeInTheDocument()
    expect(container.querySelector("ul")!.className).toContain("@5xl:grid-cols-5")
  })

  it("keeps a block with no format the grid it always drew", () => {
    const { container } = drawWith(categoriesBlock({ display: null }))

    expect(container.querySelector("ul")!.className).toContain("grid")
    expect(screen.queryByRole("group")).not.toBeInTheDocument()
  })

  it("draws the categories as chips when told to", () => {
    drawWith(categoriesBlock({ display: "CHIPS" }))

    expect(screen.getByRole("link", { name: "Blusas" })).toBeInTheDocument()
    expect(screen.getByRole("list", { name: "Categorias" })).toBeInTheDocument()
  })
})

/**
 * The owner's report: "criei um banner que é pra estender de ponta a ponta no topo e ele fica
 * arredondado nas pontas e dá pra ver a cor de fundo, os espaçamentos têm que ser padrão".
 */
describe("StorefrontSections — one spacing, and edge to edge means edge to edge", () => {
  const wrapperOf = (container: HTMLElement, text: string) =>
    [...container.children].find((child) => child.textContent?.includes(text)) as HTMLElement

  it("draws a cover in an edge-to-edge band with square corners, flush under the header", () => {
    const { container } = draw([{ ...band([poster("capa", "FULL")], "FULL"), id: "capa" }])

    expect(screen.getByText("Pôster capa").closest(".group")).not.toHaveClass("rounded-2xl")
    expect(wrapperOf(container, "Pôster capa")).not.toHaveClass("mt-8")
  })

  it("keeps the page's corner on a picture inside the measure, and 32px under the header", () => {
    const { container } = draw([band([poster("dentro", "FULL")])])

    expect(screen.getByText("Pôster dentro").closest(".group")).toHaveClass("rounded-2xl")
    expect(wrapperOf(container, "Pôster dentro")).toHaveClass("mt-8")
  })

  it("rounds a carousel inside the measure like the pictures beside it, and squares it edge to edge", () => {
    const { container, unmount } = draw([band([banner("dentro", "CAROUSEL", 2)])])
    expect(container.querySelector("img")!.className).toContain("rounded-2xl")
    unmount()

    const edge = draw([band([banner("borda", "CAROUSEL", 2)], "FULL")])
    expect(edge.container.querySelector("img")!.className).not.toContain("rounded-2xl")
  })

  it("puts 32px between two bands, and lets a cover meet the coloured strip under it", () => {
    const { container } = draw([
      { ...band([poster("capa", "FULL")], "FULL"), id: "capa" },
      { ...band([heading("faixa", "FULL")]), id: "faixa", background: "oklch(0.7 0.15 160)" },
      { ...band([heading("depois", "FULL")]), id: "depois" },
    ])

    expect(wrapperOf(container, "Título faixa")).not.toHaveClass("mt-8")
    expect(wrapperOf(container, "Título depois")).toHaveClass("mt-8")
  })

  it("keeps words in an edge-to-edge band off the screen's edge", () => {
    draw([band([heading("borda", "HALF"), poster("foto", "HALF")], "FULL")])

    expect(screen.getByText("Título borda").closest("[data-span]")).toHaveClass("px-4")
    expect(screen.getByText("Pôster foto").closest("[data-span]")).not.toHaveClass("px-4")
  })

  it("leaves out a band with nothing to draw on the shop, and keeps it in design mode to be filled", () => {
    const empty = { ...band([{ ...poster("vazio", "FULL"), items: [] }]), id: "vazio" }

    const shop = draw([empty])
    expect(shop.container.querySelector("[data-span]")).toBeNull()
    shop.unmount()

    render(
      <StorefrontSections
        sections={[empty]}
        primary=""
        categories={[]}
        routes={routes}
        showPrice
        showBadge
        messages={ptBR}
        renderBlock={(component) => <p>Espaço para {component.id}</p>}
      />,
    )
    expect(screen.getByText("Espaço para vazio")).toBeInTheDocument()
  })
})

describe("StorefrontSections — design mode's room beside a block", () => {
  it("draws what design mode puts after a band's blocks inside the same grid, so it shares their row", () => {
    const { container } = render(
      <StorefrontSections
        sections={[band([poster("a", "THIRD")])]}
        primary=""
        categories={[]}
        routes={routes}
        showPrice
        showBadge
        messages={ptBR}
        renderBandEnd={() => <div data-span="THIRD">Adicionar ao lado</div>}
      />,
    )

    const grid = container.querySelector("[data-span]")!.parentElement!
    expect(grid.lastElementChild).toHaveTextContent("Adicionar ao lado")
  })
})

// I4: the same content, another look — and back, with nothing lost.
describe("StorefrontSections — a block's layout, switched without losing its content", () => {
  it("draws a banner's first picture with its words over it, beside it, or all of them in turn", () => {
    const slides = banner("capa", "BACKDROP", 2)

    const { unmount } = draw([band([slides])])
    expect(screen.getByText("capa 1")).toBeInTheDocument()
    expect(screen.queryByText("capa 2")).not.toBeInTheDocument()
    unmount()

    const split = draw([band([{ ...slides, display: "SPLIT" }])])
    expect(screen.getByRole("heading", { name: "capa 1" })).toBeInTheDocument()
    split.unmount()

    // Back to a carousel: the second picture was kept all along.
    draw([band([{ ...slides, display: "CAROUSEL" }])])
    expect(screen.getAllByText("capa 2").length).toBeGreaterThan(0)
  })

  it("draws the benefits as cards when told to", () => {
    const benefits: PublicComponent = {
      ...poster("promessas", "FULL"),
      kind: "BENEFITS",
      display: "CARDS",
      items: [{ id: "b1", icon: "truck", title: "Frete grátis" }],
    }

    draw([band([benefits])])

    expect(screen.getByText("Frete grátis").closest("li")).toHaveClass("rounded-2xl")
  })
})
