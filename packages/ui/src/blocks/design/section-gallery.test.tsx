// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { SectionGallery, type GalleryEntry, type SectionGalleryProps } from "./section-gallery"

function gallery(over: Partial<SectionGalleryProps> = {}) {
  const props: SectionGalleryProps = { open: true, onOpenChange: vi.fn(), onAdd: vi.fn(), ...over }
  render(<SectionGallery {...props} />)
  return props
}

const cards = () => within(screen.getByRole("tabpanel")).getAllByRole("listitem")

describe("SectionGallery — the shelves", () => {
  it("opens on Recomendadas, with the shelves a page can fill", () => {
    gallery()

    expect(screen.getByRole("tab", { name: /Recomendadas/, selected: true })).toBeInTheDocument()
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent?.replace(/\d+$/, ""))).toEqual([
      "Recomendadas",
      "Capa",
      "Produtos e venda",
      "Confiança",
      "Conteúdo",
      "Conversão",
      "Topo e rodapé",
    ])
  })

  it("shows a shelf's sections, each added by its own button", async () => {
    const props = gallery()

    await userEvent.click(screen.getByRole("tab", { name: /Conteúdo/ }))
    expect(cards().map((card) => within(card).getAllByText(/./)[0]?.textContent)).toEqual(["Título", "Parágrafo"])

    await userEvent.click(screen.getByRole("button", { name: "Adicionar Parágrafo" }))
    expect(props.onAdd).toHaveBeenCalledWith("TEXT", 1)
    // Closing is the gallery's own doing: the next move is filling the section in, not adding another.
    expect(props.onOpenChange).toHaveBeenCalledWith(false)
  })

  // A site sells nothing; a shop gathers no leads: a shelf left empty is not drawn at all.
  it("draws no shelf this page cannot fill", () => {
    gallery({ unavailable: ["PRODUCTS", "CATEGORIES"] })

    expect(screen.queryByRole("tab", { name: /Produtos e venda/ })).not.toBeInTheDocument()
  })

  it("stops offering the strip once the shop has it", async () => {
    gallery({ taken: ["ANNOUNCEMENT"] })

    expect(screen.queryByRole("tab", { name: /Topo e rodapé/ })).not.toBeInTheDocument()
  })

  it("offers a row of two and of three banners where a band is created, and one banner elsewhere", async () => {
    const props = gallery({ offerRows: true })

    await userEvent.click(screen.getByRole("tab", { name: /Capa/ }))
    expect(cards()).toHaveLength(3)
    await userEvent.click(screen.getByRole("button", { name: "Adicionar 3 banners lado a lado" }))
    expect(props.onAdd).toHaveBeenCalledWith("BANNER", 3)
  })

  it("offers one banner only where a block goes into a band", async () => {
    gallery()

    await userEvent.click(screen.getByRole("tab", { name: /Capa/ }))
    expect(cards()).toHaveLength(1)
  })
})

describe("SectionGallery — the search and the place", () => {
  // "carrossel" is only in the banner's line, never in its name; the search looks in every shelf.
  it("finds a section by what its line says, across every shelf", async () => {
    gallery()

    await userEvent.type(screen.getByRole("searchbox", { name: "Buscar seção" }), "carrossel")

    const results = screen.getByRole("region", { name: "Resultados" })
    expect(within(results).getAllByRole("listitem")).toHaveLength(1)
    expect(within(results).getByRole("button", { name: "Adicionar Banner" })).toBeInTheDocument()
  })

  it("says so when the search matches nothing", async () => {
    gallery()

    await userEvent.type(screen.getByRole("searchbox"), "xyz")

    expect(screen.getByText("Nenhuma seção com esse nome.")).toBeInTheDocument()
  })

  // The shelf still marked as selected leaves the search too, not only the others.
  it("leaves the search for the shelf pressed, the selected one included", async () => {
    gallery()

    await userEvent.type(screen.getByRole("searchbox"), "carrossel")
    await userEvent.click(screen.getByRole("tab", { name: /Recomendadas/ }))

    expect(screen.getByRole("searchbox")).toHaveValue("")
    expect(screen.queryByRole("region", { name: "Resultados" })).not.toBeInTheDocument()
  })

  it("says where the section goes", () => {
    gallery({ placement: "Entra entre Capa e Produtos." })

    expect(screen.getByRole("dialog", { name: "Adicionar seção" })).toHaveAccessibleDescription("Entra entre Capa e Produtos.")
  })

  // Only the open shelf asks for previews: a shop's products are drawn for the shelf being looked at.
  it("asks the screen for the open shelf's previews only", async () => {
    const renderPreview = vi.fn((_entry: GalleryEntry) => <p>prévia</p>)
    gallery({ renderPreview })

    expect(renderPreview.mock.calls.map(([entry]) => entry.kind)).not.toContain("HEADING")
    await userEvent.click(screen.getByRole("tab", { name: /Conteúdo/ }))
    expect(renderPreview.mock.calls.map(([entry]) => entry.kind)).toContain("HEADING")
  })

  // A preview is the shop's renderer: a contact form in it must not be a tab stop nobody can see.
  it("takes the previews out of the tab order and away from assistive technology", async () => {
    gallery({ renderPreview: () => <input aria-label="Seu nome" /> })

    const field = screen.getAllByLabelText("Seu nome", { selector: "input" })[0]!
    expect(field.closest("[inert]")).not.toBeNull()
    await expectNoA11yViolations(screen.getByRole("dialog"))
  })

  // No preview to draw — a shop with no picture yet — and the card keeps its wireframe, never an empty box.
  it("keeps a card's wireframe where the screen has no preview for it", () => {
    gallery({ renderPreview: () => null })

    for (const card of cards()) expect(card.querySelector("[inert]")).not.toBeEmptyDOMElement()
  })

  it("speaks the panel's language", () => {
    gallery({ messages: en })

    expect(screen.getByRole("dialog", { name: "Add a section" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /Recommended/ })).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    gallery({ placement: "Entra no fim da página, depois de Capa." })

    await expectNoA11yViolations(screen.getByRole("dialog"))
  })
})
