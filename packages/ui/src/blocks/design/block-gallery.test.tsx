// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { BlockGallery } from "./block-gallery"

/**
 * The panel is portalled, so nothing it draws is under `render`'s container: every query goes
 * through `screen`, and axe is handed `document.body`. Opened with `findByRole` because the sheet
 * mounts asynchronously, the same way `admin-store-menu.test.tsx` waits for its menu.
 */
async function open(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /Adicionar bloco/ }))
  await screen.findByRole("dialog")
}

const EVERY_KIND = [
  "BANNER",
  "HEADING",
  "TEXT",
  "BENEFITS",
  "CATEGORIES",
  "ANNOUNCEMENT",
  "PRODUCTS",
  "CONTACT",
] as const

describe("BlockGallery", () => {
  it("offers every kind, each with a line saying what it is", async () => {
    const user = userEvent.setup()
    render(<BlockGallery onAdd={vi.fn()} />)

    await open(user)

    expect(screen.getByRole("button", { name: /Título/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Parágrafo/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Vantagens/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Barra de aviso/ })).toBeInTheDocument()
    // The hint is the whole point of the gallery, so it is asserted and not assumed.
    expect(screen.getByText("Imagem ou carrossel")).toBeInTheDocument()
    expect(screen.getByText("Trilho ou grade, da fonte que você escolher")).toBeInTheDocument()
  })

  it("offers a banner, and a heading apart from a paragraph", async () => {
    const user = userEvent.setup()
    render(<BlockGallery onAdd={vi.fn()} />)

    await open(user)

    expect(screen.getByRole("button", { name: /Banner/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Título/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Parágrafo/ })).toBeInTheDocument()
  })

  /** Four short lists instead of one long one, which is what the dropdown could not do. */
  it("files the kinds under headings", async () => {
    const user = userEvent.setup()
    render(<BlockGallery onAdd={vi.fn()} />)

    await open(user)

    for (const group of ["Destaque", "Catálogo", "Conteúdo", "Contato"]) {
      expect(screen.getByRole("heading", { name: group })).toBeInTheDocument()
    }
  })

  /**
   * A heading over an empty list is exactly what filing by page type would have produced, so the
   * group goes when nothing in it is offered.
   */
  it("draws no heading for a group this page cannot hold", async () => {
    const user = userEvent.setup()
    render(<BlockGallery onAdd={vi.fn()} unavailable={["PRODUCTS", "CATEGORIES"]} />)

    await open(user)

    expect(screen.queryByRole("heading", { name: "Catálogo" })).not.toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Contato" })).toBeInTheDocument()
  })

  it("narrows to what was searched, by name or by the line under it", async () => {
    const user = userEvent.setup()
    render(<BlockGallery onAdd={vi.fn()} />)

    await open(user)
    // "carrossel" is only in the banner's hint, never in its name.
    await user.type(screen.getByRole("searchbox", { name: "Buscar bloco" }), "carrossel")

    expect(screen.getByRole("button", { name: /Banner/ })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Vantagens/ })).not.toBeInTheDocument()
  })

  it("says so when the search matches nothing", async () => {
    const user = userEvent.setup()
    render(<BlockGallery onAdd={vi.fn()} />)

    await open(user)
    await user.type(screen.getByRole("searchbox", { name: "Buscar bloco" }), "xilofone")

    expect(screen.getByText("Nenhum bloco com esse nome.")).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Destaque" })).not.toBeInTheDocument()
  })

  // A shop may hold as many showcases as it has shelves to show; only the strip is one of a kind.
  it("offers a showcase of products, with what it can be", async () => {
    const user = userEvent.setup()
    render(<BlockGallery onAdd={vi.fn()} taken={["ANNOUNCEMENT"]} />)

    await open(user)

    expect(screen.getByRole("button", { name: /Vitrine de produtos/ })).toBeInTheDocument()
  })

  it("stops offering a block the shop already has one of", async () => {
    const user = userEvent.setup()
    render(<BlockGallery onAdd={vi.fn()} taken={["ANNOUNCEMENT"]} />)

    await open(user)

    expect(screen.queryByRole("button", { name: /Barra de aviso/ })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Título/ })).toBeInTheDocument()
  })

  /** A site has no products to list; a shop has no screen for the leads a form would gather. */
  it("leaves out what this kind of page cannot hold", async () => {
    const user = userEvent.setup()
    render(<BlockGallery onAdd={vi.fn()} unavailable={["PRODUCTS", "CATEGORIES"]} />)

    await open(user)

    expect(screen.queryByRole("button", { name: /Vitrine de produtos/ })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Formulário de contato/ })).toBeInTheDocument()
  })

  it("says which kind was chosen, and closes", async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    render(<BlockGallery onAdd={onAdd} />)

    await open(user)
    await user.click(screen.getByRole("button", { name: /Título/ }))

    expect(onAdd).toHaveBeenCalledWith("HEADING", 1)
    // Closing is the block's own doing: the shopkeeper's next move is filling the block in, not
    // adding a second one, and a panel left open covers the page it was just added to.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  /**
   * Blocks share a row only inside one band, so a row of banners is a band of its own: it is
   * offered where a band is created, and "3 banners lado a lado" hands back three, not a banner.
   */
  it("offers a row of two and of three banners where a band is created", async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    render(<BlockGallery onAdd={onAdd} offerRows />)

    await open(user)

    expect(screen.getByRole("button", { name: /2 banners lado a lado/ })).toHaveTextContent(
      "Na mesma linha, metade cada",
    )
    await user.click(screen.getByRole("button", { name: /3 banners lado a lado/ }))

    expect(onAdd).toHaveBeenCalledWith("BANNER", 3)
  })

  it("keeps the whole banner beside the rows, as one", async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    render(<BlockGallery onAdd={onAdd} offerRows />)

    await open(user)
    await user.click(screen.getByRole("button", { name: /^Banner/ }))

    expect(onAdd).toHaveBeenCalledWith("BANNER", 1)
  })

  // From a band's own "+", a row would have to say what becomes of what the band already holds.
  it("offers one banner only where a block goes into a band", async () => {
    const user = userEvent.setup()
    render(<BlockGallery onAdd={vi.fn()} />)

    await open(user)

    expect(screen.getByRole("button", { name: /^Banner/ })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /banners lado a lado/ })).not.toBeInTheDocument()
  })

  it("finds the rows by what they are", async () => {
    const user = userEvent.setup()
    render(<BlockGallery onAdd={vi.fn()} offerRows />)

    await open(user)
    await user.type(screen.getByRole("searchbox", { name: "Buscar bloco" }), "lado a lado")

    expect(screen.getByRole("button", { name: /2 banners lado a lado/ })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /^Banner/ })).not.toBeInTheDocument()
  })

  it("draws no control at all when there is nothing left to add", () => {
    const { container } = render(<BlockGallery onAdd={vi.fn()} taken={EVERY_KIND} />)

    expect(container).toBeEmptyDOMElement()
  })

  it("has no accessibility violations, opened", async () => {
    // `document.body`, because the panel is portalled out of the render container — and opened,
    // because a panel nobody opened in a test is a panel nobody has checked.
    render(<BlockGallery onAdd={vi.fn()} offerRows defaultOpen />)

    await screen.findByRole("dialog")

    await expectNoA11yViolations(document.body)
  })

  // Every "+" of the panel opens this one gallery, which then has no trigger of its own.
  it("opens from outside with no trigger, and says when it closes", async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const onAdd = vi.fn()
    render(<BlockGallery open onOpenChange={onOpenChange} onAdd={onAdd} />)

    expect(screen.queryByRole("button", { name: "Adicionar bloco" })).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /Título/ }))

    expect(onAdd).toHaveBeenCalledWith("HEADING", 1)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
