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
      name="Bolsa Amora"
      description="Feita à mão em fio de algodão."
      priceCents={18900}
      compareAtPriceCents={24900}
      images={images}
      backHref="/lessari?categoria=mais-vendidos"
      locale="pt-BR"
      {...overrides}
    />,
  )
}

describe("StorefrontProductDetail", () => {
  it("names the product as the page's one heading", () => {
    renderProduct()

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Bolsa Amora")
  })

  it("goes back to the category it came from, named", () => {
    renderProduct({ categoryName: "Mais vendidos" })

    expect(screen.getByRole("link", { name: /Mais vendidos/ })).toHaveAttribute(
      "href",
      "/lessari?categoria=mais-vendidos",
    )
  })

  it("falls back to the shop when the product belongs to no category", () => {
    renderProduct({ categoryName: null, backHref: "/lessari" })

    expect(screen.getByRole("link", { name: /Voltar para a loja/ })).toHaveAttribute("href", "/lessari")
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
      categoryName: "Mais vendidos",
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

    it("opens on the combination the address asked for", () => {
      renderProduct({ ...withVariants, initialVariantId: "g-preto" })

      expect(screen.getByRole("group", { name: "Tamanho: G" })).toBeInTheDocument()
      expect(screen.getByText("R$ 219,00")).toBeInTheDocument()
    })

    it("changes the price, the photo and the order message with the choice, and tells the screen", async () => {
      const user = userEvent.setup()
      const onVariantChange = vi.fn()
      renderProduct({ ...withVariants, onVariantChange })

      await user.click(screen.getByRole("button", { name: "Terracota" }))

      expect(onVariantChange).toHaveBeenCalledWith("p-terracota")
      expect(screen.getByText("R$ 199,00")).toBeInTheDocument()
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

      await user.click(screen.getByRole("button", { name: "M, esgotado" }))
      expect(screen.queryByRole("link", { name: /WhatsApp/ })).toBeNull()
      await user.click(screen.getByRole("button", { name: "Avise-me quando chegar" }))
      const dialog = await screen.findByRole("dialog")
      await user.type(within(dialog).getByRole("textbox", { name: "WhatsApp" }), "11977776666")
      await user.click(within(dialog).getByRole("button", { name: "Avisar-me" }))

      expect(onSubmit).toHaveBeenCalledWith("m-areia", expect.objectContaining({ phone: "11977776666" }))
    })

    it("has no accessibility violations", async () => {
      const { container } = renderProduct({ ...withVariants, restock: { onSubmit: () => {}, status: "idle" } })

      await expectNoA11yViolations(container)
    })
  })
})
