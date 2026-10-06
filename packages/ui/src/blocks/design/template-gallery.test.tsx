// Libs
import { act, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { TemplateGallery, type TemplateGalleryProps } from "./template-gallery"
import { HOME_TEMPLATES, LANDING_TEMPLATES, PRODUCTS, samplePreview } from "./template-gallery.fixtures"
import { TemplatePreviewFrame } from "./template-preview-frame"

function gallery(over: Partial<TemplateGalleryProps> = {}) {
  const props: TemplateGalleryProps = {
    open: true,
    onOpenChange: vi.fn(),
    state: "ready",
    templates: HOME_TEMPLATES,
    selectedId: null,
    onSelect: vi.fn(),
    renderPreview: vi.fn(samplePreview),
    ...over,
  }
  const view = render(<TemplateGallery {...props} />)
  return { props, ...view }
}

const cards = () => within(screen.getByRole("list", { name: "Modelos" })).getAllByRole("listitem")
const card = (name: string) => cards().find((item) => within(item).queryByRole("heading", { name }))!

/** An observer a test drives: nothing is on screen until the test says which card is. */
function stubObserver() {
  const watched = new Map<Element, (entries: IntersectionObserverEntry[]) => void>()
  class Observer {
    constructor(private readonly changed: (entries: IntersectionObserverEntry[]) => void) {}
    observe(element: Element) {
      watched.set(element, this.changed)
    }
    disconnect() {
      for (const [element, changed] of watched) if (changed === this.changed) watched.delete(element)
    }
    unobserve() {}
    takeRecords() {
      return []
    }
  }
  vi.stubGlobal("IntersectionObserver", Observer)

  return {
    /** Brings a card on screen. */
    show: (item: HTMLElement) =>
      act(() => {
        for (const [element, changed] of watched) {
          if (item.contains(element)) changed([{ isIntersecting: true, target: element } as IntersectionObserverEntry])
        }
      }),
  }
}

// Every card on screen unless a test says which: where the browser cannot watch, a card counts as seen.
beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", undefined)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("TemplateGallery — the cards", () => {
  it("offers a card per model, in the order given, with its name, what it builds and whether it is suggested", () => {
    gallery()

    expect(screen.getByRole("dialog", { name: "Modelos de página" })).toBeInTheDocument()
    expect(cards().map((item) => within(item).getByRole("heading").textContent)).toEqual(["Ofertas", "Vitrine com capa", "Por categorias", "Catálogo enxuto"])
    expect(within(card("Ofertas")).getByText("Indicado")).toBeInTheDocument()
    expect(within(card("Vitrine com capa")).queryByText("Indicado")).not.toBeInTheDocument()
    expect(within(card("Catálogo enxuto")).getByText(/as categorias em atalhos/)).toBeInTheDocument()
  })

  it("says which models ask for a product", () => {
    gallery({ templates: LANDING_TEMPLATES })

    expect(within(card("Lançamento de produto")).getByText("Pede um produto")).toBeInTheDocument()
    expect(within(card("Em branco")).queryByText("Pede um produto")).not.toBeInTheDocument()
  })

  it("chooses a model by its own button, which then reads as pressed", async () => {
    const { props, rerender } = gallery()

    await userEvent.click(screen.getByRole("button", { name: "Ver o modelo Por categorias" }))
    expect(props.onSelect).toHaveBeenCalledWith("por-categorias")

    rerender(<TemplateGallery {...props} selectedId="por-categorias" />)
    expect(screen.getByRole("button", { name: "Ver o modelo Por categorias", pressed: true })).toHaveTextContent("Selecionado")
    expect(screen.getByRole("button", { name: "Ver o modelo Ofertas", pressed: false })).toHaveTextContent("Ver modelo")
  })
})

describe("TemplateGallery — the previews", () => {
  it("draws a card's preview only once the card is on screen", async () => {
    const observer = stubObserver()
    const { props } = gallery()

    // Nothing asked for yet: every card holds its skeleton.
    expect(props.renderPreview).not.toHaveBeenCalled()
    expect(screen.getAllByText("Carregando a prévia")).toHaveLength(4)

    await observer.show(card("Por categorias"))

    expect(screen.getByTestId("preview-card-por-categorias")).toBeInTheDocument()
    expect(screen.queryByTestId("preview-card-ofertas")).not.toBeInTheDocument()
    expect(vi.mocked(props.renderPreview).mock.calls.map(([template, size]) => [template.id, size])).toEqual([["por-categorias", "card"]])
  })

  it("draws every card where the browser cannot watch", () => {
    gallery()

    expect(screen.getAllByTestId(/^preview-card-/)).toHaveLength(4)
  })

  it("keeps a preview out of the keyboard's and a screen reader's way", () => {
    gallery()

    const preview = screen.getByTestId("preview-card-ofertas").parentElement!
    expect(preview).toHaveAttribute("inert")
    expect(preview).toHaveAttribute("aria-hidden", "true")
    // The link and the field a real preview holds are not among what can be reached.
    expect(screen.queryByRole("link", { name: "Ver produto" })).not.toBeInTheDocument()
    expect(screen.queryByRole("textbox", { name: "E-mail" })).not.toBeInTheDocument()
  })

  it("lets one preview fail in its own card while the others draw, and offers to try it again", async () => {
    const onRetry = vi.fn()
    gallery({
      renderPreview: (template, size) =>
        template.id === "ofertas" ? <TemplatePreviewFrame state="failed" size={size} onRetry={onRetry} /> : samplePreview(template, size),
    })

    expect(within(card("Ofertas")).getByRole("alert")).toHaveTextContent("Não foi possível carregar esta prévia.")
    expect(screen.getByTestId("preview-card-vitrine-com-capa")).toBeInTheDocument()

    await userEvent.click(within(card("Ofertas")).getByRole("button", { name: "Tentar de novo" }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it("shows the chosen model whole, named, in a region the keyboard can scroll", () => {
    const { props } = gallery({ selectedId: "ofertas" })

    const region = screen.getByRole("region", { name: "Prévia de Ofertas" })
    expect(region).toHaveAttribute("tabindex", "0")
    expect(within(region).getByTestId("preview-large-ofertas")).toBeInTheDocument()
    expect(vi.mocked(props.renderPreview).mock.calls.some(([template, size]) => template.id === "ofertas" && size === "large")).toBe(true)
  })

  it("says to choose one while none is chosen", () => {
    gallery()

    expect(screen.getByText("Escolha um modelo para ver a página inteira.")).toBeInTheDocument()
    expect(screen.queryByRole("region")).not.toBeInTheDocument()
  })

  it("goes back from the chosen model to the cards, with the focus on the card it came from", async () => {
    const { props, rerender } = gallery()
    await userEvent.click(screen.getByRole("button", { name: "Ver o modelo Ofertas" }))
    rerender(<TemplateGallery {...props} selectedId="ofertas" />)

    await userEvent.click(screen.getByRole("button", { name: "Voltar aos modelos" }))

    await vi.waitFor(() => expect(screen.getByRole("button", { name: "Ver o modelo Ofertas" })).toHaveFocus())
  })
})

describe("TemplateGallery — what a model asks for", () => {
  it("offers the product search only when a model asks for one", () => {
    const product = { options: PRODUCTS, state: "ready" as const, selectedId: null, onPick: vi.fn() }
    const { unmount } = gallery({ product })
    expect(screen.queryByLabelText("Produto dos modelos")).not.toBeInTheDocument()
    unmount()

    gallery({ templates: LANDING_TEMPLATES, product })
    expect(screen.getByLabelText("Produto dos modelos")).toBeInTheDocument()
  })

  it("picks the product the models are drawn around", async () => {
    const onPick = vi.fn()
    gallery({ templates: LANDING_TEMPLATES, product: { options: PRODUCTS, state: "ready", selectedId: null, onPick } })

    await userEvent.click(screen.getByRole("button", { name: "Relógio clássico" }))

    expect(onPick).toHaveBeenCalledWith("p2")
  })

  it("asks for a product in the card of a model that needs one", () => {
    gallery({
      templates: LANDING_TEMPLATES,
      product: { options: PRODUCTS, state: "ready", selectedId: null, onPick: vi.fn() },
      renderPreview: (template, size) => (template.needsProduct ? <TemplatePreviewFrame state="needsProduct" size={size} /> : samplePreview(template, size)),
    })

    expect(within(card("Promoção relâmpago")).getByText("Escolha um produto para ver a prévia.")).toBeInTheDocument()
    expect(screen.getByTestId("preview-card-em-branco")).toBeInTheDocument()
  })
})

describe("TemplateGallery — the filter", () => {
  it("keeps only the models suggested for the shop, and brings the others back", async () => {
    gallery()

    await userEvent.click(screen.getByRole("switch", { name: "Indicados para a sua loja" }))
    expect(cards().map((item) => within(item).getByRole("heading").textContent)).toEqual(["Ofertas"])

    await userEvent.click(screen.getByRole("switch", { name: "Indicados para a sua loja" }))
    expect(cards()).toHaveLength(4)
  })

  // A switch that would keep everything, or nothing, filters nothing.
  it("is not offered when no model is suggested, or all are", () => {
    const { unmount } = gallery({ templates: LANDING_TEMPLATES })
    expect(screen.queryByRole("switch")).not.toBeInTheDocument()
    unmount()

    gallery({ templates: HOME_TEMPLATES.map((template) => ({ ...template, recommended: true })) })
    expect(screen.queryByRole("switch")).not.toBeInTheDocument()
  })
})

describe("TemplateGallery — the list's own states", () => {
  it("is grey cards while the models are on their way", () => {
    gallery({ state: "loading", templates: [] })

    expect(screen.getByRole("status")).toHaveTextContent("Carregando os modelos")
    expect(screen.queryByRole("list", { name: "Modelos" })).not.toBeInTheDocument()
  })

  it("says the models could not be read, and tries again", async () => {
    const onRetry = vi.fn()
    gallery({ state: "failed", templates: [], onRetry })

    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar os modelos.")
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it("says so when no model is for this page", () => {
    gallery({ templates: [] })

    expect(screen.getByText("Nenhum modelo disponível para esta página.")).toBeInTheDocument()
  })
})

describe("TemplateGallery — applying", () => {
  it("offers no way to apply without `onApply`", () => {
    gallery({ selectedId: "ofertas" })

    expect(screen.queryByRole("button", { name: "Usar este modelo" })).not.toBeInTheDocument()
  })

  it("hands the chosen model to `onApply`, and waits while one is being applied", async () => {
    const onApply = vi.fn()
    const { props, rerender } = gallery({ selectedId: "ofertas", onApply })

    await userEvent.click(screen.getByRole("button", { name: "Usar este modelo" }))
    expect(onApply).toHaveBeenCalledWith(HOME_TEMPLATES[0])

    rerender(<TemplateGallery {...props} applying />)
    expect(screen.getByRole("button", { name: "Usar este modelo" })).toBeDisabled()
  })

  it("does not apply a model that still waits for its product, and says what it waits for", async () => {
    const onApply = vi.fn()
    gallery({ templates: LANDING_TEMPLATES, selectedId: "lancamento", onApply, applyBlocked: "Escolha um produto para usar este modelo." })

    expect(screen.getByRole("button", { name: "Usar este modelo" })).toBeDisabled()
    expect(screen.getByText("Escolha um produto para usar este modelo.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Usar este modelo" }))
    expect(onApply).not.toHaveBeenCalled()
  })
})

describe("TemplateGallery — the dialog", () => {
  it("closes by its own button", async () => {
    const { props } = gallery()

    await userEvent.click(screen.getByRole("button", { name: "Fechar" }))

    expect(props.onOpenChange).toHaveBeenCalledWith(false)
  })

  it("keeps the focus inside while it is open: Tab never reaches the editor behind it", async () => {
    render(<button type="button">Publicar</button>)
    gallery({ selectedId: "ofertas" })
    const dialog = screen.getByRole("dialog")

    for (let press = 0; press < 14; press += 1) {
      await userEvent.tab()
      const active = document.activeElement as HTMLElement
      // The dialog's own guards hold the focus for an instant on the way round; nothing else outside it does.
      expect(dialog.contains(active) || active.hasAttribute("data-base-ui-focus-guard"), active.outerHTML.slice(0, 200)).toBe(true)
    }
    expect(screen.getByText("Publicar")).not.toHaveFocus()
  })

  it("speaks the reader's language", () => {
    gallery({ messages: en, selectedId: "ofertas" })

    expect(screen.getByRole("dialog", { name: "Page templates" })).toBeInTheDocument()
    expect(screen.getByRole("region", { name: "Preview of Deals" })).toBeInTheDocument()
    expect(screen.getByRole("switch", { name: "Suggested for your shop" })).toBeInTheDocument()
  })

  it.each([
    ["with cards and a model chosen", { selectedId: "ofertas" as const }],
    ["on a landing, asking for a product", { templates: LANDING_TEMPLATES, product: { options: PRODUCTS, state: "ready" as const, selectedId: null, onPick: vi.fn() } }],
    ["loading", { state: "loading" as const, templates: [] }],
    ["failed", { state: "failed" as const, templates: [], onRetry: vi.fn() }],
    ["empty", { templates: [] }],
  ])("has no accessibility violations %s", async (_name, over) => {
    gallery(over)

    await expectNoA11yViolations(document.body)
  })
})
