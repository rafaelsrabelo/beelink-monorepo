// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontProductDetail } from "./storefront-product"

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
})
