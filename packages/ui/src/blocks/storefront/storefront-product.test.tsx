// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { ORDER_VARIANT_MARK } from "../../lib/variant-choice"
import { StorefrontProductDetail } from "./storefront-product"
import { BLOUSE_OPTIONS, BLOUSE_VARIANTS } from "./variant-choice-fixtures"

const images = [
  { id: "i1", url: "https://cdn/1.png", alt: "De frente" },
  { id: "i2", url: "https://cdn/2.png", alt: null },
]

function renderProduct(overrides: Partial<Parameters<typeof StorefrontProductDetail>[0]> = {}) {
  return render(
    <StorefrontProductDetail
      shopName="Lessari"
      homeHref="/lessari"
      name="Bolsa Amora"
      description="Feita à mão em fio de algodão."
      priceCents={18900}
      compareAtPriceCents={24900}
      images={images}
      locale="pt-BR"
      {...overrides}
    />,
  )
}

describe("StorefrontProductDetail", () => {
  it("adds a product without options as itself, and offers no cart when sold out", async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    const { rerender } = renderProduct({ cart: { onAdd, href: "/loja/carrinho" } })

    await user.click(screen.getByRole("button", { name: "Adicionar ao carrinho" }))
    expect(onAdd).toHaveBeenCalledWith(null, 1)

    rerender(<StorefrontProductDetail shopName="Lessari" homeHref="/lessari" name="Bolsa Amora" description={null} priceCents={18900} compareAtPriceCents={null} images={images} locale="pt-BR" soldOut cart={{ onAdd, href: "#" }} />)
    expect(screen.queryByRole("button", { name: "Adicionar ao carrinho" })).toBeNull()
  })


  it("lays out 5b's three parts in order: the photos, the information under the shop's name, and a region for buying", () => {
    renderProduct({ cart: { onAdd: () => {}, href: "/lessari/carrinho" } })

    const photo = screen.getAllByRole("img")[0]!
    const heading = screen.getByRole("heading", { level: 1 })
    const buy = screen.getByRole("region", { name: "Comprar" })
    expect(screen.getByRole("link", { name: "Visite a loja Lessari" })).toHaveAttribute("href", "/lessari")
    expect(photo.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(heading.compareDocumentPosition(buy) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(buy).toContainElement(screen.getByRole("button", { name: "Adicionar ao carrinho" }))
  })

  it("draws the description's first list as 'Sobre este item' in the information, before the region for buying", () => {
    renderProduct({ description: "Feita à mão.\n\n- **Algodão** cru\n- Alça longa", cart: { onAdd: () => {}, href: "#" } })

    const about = screen.getByRole("heading", { level: 2, name: "Sobre este item" })
    expect(screen.getByText("Algodão", { selector: "strong" })).toBeInTheDocument()
    expect(about.compareDocumentPosition(screen.getByRole("region", { name: "Comprar" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("names the product as the page's one heading", () => {
    renderProduct()

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Bolsa Amora")
  })

  /**
   * Which photo is showing is state about looking, not about the shop. Putting it in the address
   * would make every thumbnail a new entry in someone's history.
   */
  it("changes the picture without changing the address", async () => {
    const { container } = renderProduct()

    const thumbnails = screen.getAllByRole("button")
    // Named, not anonymous: the picture inside is decorative, so the name comes from the alt or
    // from its place in the gallery.
    expect(thumbnails[0]).toHaveAccessibleName("De frente")
    expect(thumbnails[1]).toHaveAccessibleName("Foto 2 de 2")
    expect(thumbnails[0]).toHaveAttribute("aria-pressed", "true")

    await userEvent.click(thumbnails[1])

    expect(thumbnails[1]).toHaveAttribute("aria-pressed", "true")
    expect(container.querySelector("img[alt='Bolsa Amora']")).not.toBeNull()
  })

  it("offers no gallery for a product with one photograph", () => {
    renderProduct({ images: [images[0]] })

    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("says so plainly when there is no photograph at all", () => {
    renderProduct({ images: [] })

    expect(screen.getByText("Sem foto")).toBeInTheDocument()
  })

  it("offers the order button only when the shop has a WhatsApp", () => {
    renderProduct()
    expect(screen.queryByRole("link", { name: /WhatsApp/ })).not.toBeInTheDocument()

    renderProduct({ orderHref: "https://wa.me/5585999998888?text=Ol%C3%A1" })
    expect(screen.getByRole("link", { name: "Pedir este pelo WhatsApp" })).toHaveAttribute(
      "href",
      "https://wa.me/5585999998888?text=Ol%C3%A1",
    )
  })

  it("has no accessibility violations", async () => {
    const { container } = renderProduct({
      orderHref: "https://wa.me/5585999998888",
    })

    await expectNoA11yViolations(container)
  })

  /**
   * The page keeps answering when the shelf empties, because this address is what a shopkeeper
   * sends on WhatsApp and a 404 there is the most visible failure this product can produce. What
   * goes away is the way to order — sending someone a request the shop cannot fill wastes two
   * people's time instead of one's.
   */
  it("says the shelf is empty and takes away the way to order", () => {
    renderProduct({ soldOut: true, orderHref: "https://wa.me/5585999998888?text=Ol%C3%A1" })

    expect(screen.getByText("Esgotado")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /WhatsApp/i })).not.toBeInTheDocument()
    expect(screen.getByText(/Acabou por enquanto/)).toBeInTheDocument()
  })

  it("keeps the product itself readable when it is sold out", () => {
    renderProduct({ soldOut: true })

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Bolsa Amora")
  })

  describe("with variations", () => {
    const withVariants = {
      options: BLOUSE_OPTIONS,
      variants: BLOUSE_VARIANTS,
      orderHref: `https://wa.me/5511?text=Blusa${ORDER_VARIANT_MARK}`,
    }

    it("puts the chosen combination in the cart, in the quantity chosen, when the page has a cart", async () => {
      const user = userEvent.setup()
      const onAdd = vi.fn()
      renderProduct({ ...withVariants, initialVariantId: "g-preto", cart: { onAdd, href: "/loja/carrinho" } })

      await user.click(screen.getByRole("button", { name: "Aumentar a quantidade de Bolsa Amora" }))
      await user.click(screen.getByRole("button", { name: "Adicionar ao carrinho" }))

      expect(onAdd).toHaveBeenCalledWith("g-preto", 2)
      // WhatsApp stays, now the quieter way.
      expect(screen.getByRole("link", { name: /Pedir/ })).toHaveAttribute("href", expect.stringContaining("wa.me"))
    })

    it("opens on the combination the address asked for", () => {
      renderProduct({ ...withVariants, initialVariantId: "g-preto" })

      expect(screen.getByRole("group", { name: "Tamanho: G" })).toBeInTheDocument()
      expect(document.querySelector("[aria-live]")).toHaveTextContent("R$ 219,00")
    })

    it("puts on each size the price it would cost with the colour kept, since sizes cost differently", () => {
      renderProduct(withVariants)

      // From P·Areia: G leads to G·Preto at R$ 219,00, and M·Areia is sold out, which it says where
      // its price would be.
      expect(screen.getByRole("button", { name: /^G, R\$\s219,00/ })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "M, Esgotado · avise-me" })).toBeInTheDocument()
    })

    it("changes the price, the photo and the order message with the choice, and tells the screen", async () => {
      const user = userEvent.setup()
      const onVariantChange = vi.fn()
      renderProduct({ ...withVariants, onVariantChange })

      await user.click(screen.getByRole("button", { name: /^Terracota/ }))

      expect(onVariantChange).toHaveBeenCalledWith("p-terracota")
      expect(document.querySelector("[aria-live]")).toHaveTextContent("R$ 199,00")
      expect(screen.getAllByRole("img")[0]).toHaveAttribute("src", "https://picsum.photos/seed/terracota/800/800")
      expect(screen.getByRole("link", { name: /WhatsApp/ })).toHaveAttribute(
        "href",
        `https://wa.me/5511?text=Blusa${encodeURIComponent(" (P · Terracota)")}`,
      )
    })

    it("offers Avise-me instead of ordering a sold-out combination, and asks for that one", async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      renderProduct({ ...withVariants, restock: { onSubmit, status: "idle" } })

      await user.click(screen.getByRole("button", { name: "M, Esgotado · avise-me" }))
      expect(screen.queryByRole("link", { name: /WhatsApp/ })).toBeNull()
      await user.click(screen.getByRole("button", { name: "Avise-me quando chegar" }))
      const dialog = await screen.findByRole("dialog")
      await user.type(within(dialog).getByRole("textbox", { name: "WhatsApp" }), "11977776666")
      await user.click(within(dialog).getByRole("button", { name: "Avisar-me" }))

      expect(onSubmit).toHaveBeenCalledWith("m-areia", expect.objectContaining({ phone: "11977776666" }))
    })

    it("shows the photos of the colour chosen and the ones of every combination, the colour's first", async () => {
      const user = userEvent.setup()
      const marked = [
        { id: "geral", url: "https://cdn/geral.png", alt: "Etiqueta", optionValueIds: [] },
        { id: "areia", url: "https://cdn/areia.png", alt: "Areia de frente", optionValueIds: ["areia"] },
        { id: "preto", url: "https://cdn/preto.png", alt: "Preto de frente", optionValueIds: ["preto"] },
      ]
      renderProduct({ ...withVariants, images: marked })

      expect(screen.getAllByRole("img")[0]).toHaveAttribute("src", "https://cdn/areia.png")
      expect(screen.queryByRole("button", { name: "Preto de frente" })).toBeNull()

      await user.click(screen.getByRole("button", { name: /^G, / }))

      expect(screen.getAllByRole("img")[0]).toHaveAttribute("src", "https://cdn/preto.png")
      expect(screen.queryByRole("button", { name: "Areia de frente" })).toBeNull()
      expect(screen.getByRole("button", { name: "Etiqueta" })).toBeInTheDocument()
    })

    it("moves to the combination a value has when the one chosen does not exist", async () => {
      const user = userEvent.setup()
      const onVariantChange = vi.fn()
      renderProduct({ ...withVariants, onVariantChange })

      await user.click(screen.getByRole("button", { name: /^G,/ }))

      expect(onVariantChange).toHaveBeenCalledWith("g-preto")
      expect(screen.getByRole("group", { name: "Cor: Preto" })).toBeInTheDocument()
      expect(document.querySelector("[aria-live]")).toHaveTextContent("R$ 219,00")
    })

    it("has no accessibility violations", async () => {
      const { container } = renderProduct({ ...withVariants, restock: { onSubmit: () => {}, status: "idle" } })

      await expectNoA11yViolations(container)
    })
  })
})
