// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontProductPurchase, type StorefrontProductPurchaseProps } from "./storefront-product-purchase"

function renderBox(over: Partial<StorefrontProductPurchaseProps> = {}) {
  const onAdd = vi.fn()
  const view = render(
    <StorefrontProductPurchase
      name="Pré-Treino Haze"
      priceCents={11990}
      compareAtPriceCents={14990}
      locale="pt-BR"
      showPrice
      available
      choosing
      cart={{ onAdd, href: "/loja/carrinho" }}
      finishesOnWhatsApp
      seller={{ name: "Mutante Suplementos", paymentMethods: ["PIX", "CREDIT_CARD", "DEBIT_CARD", "MONEY"] }}
      {...over}
    />,
  )
  return { onAdd, ...view }
}

const box = () => screen.getByRole("region", { name: "Comprar" })

describe("StorefrontProductPurchase", () => {
  it("draws 5b's box: the price, 'Em estoque', how many, the two pills, the notice and who sells it", () => {
    renderBox()

    expect(within(box()).getByText("R$ 119,90")).toBeInTheDocument()
    expect(within(box()).getByText("Em estoque")).toHaveClass("text-lg", "font-bold", "text-shop-positive-ink")
    expect(within(box()).getByRole("combobox", { name: "Quantidade" })).toHaveValue("1")
    expect(within(box()).getByRole("button", { name: "Adicionar ao carrinho" })).toHaveClass("h-12", "rounded-full", "bg-shop-primary")
    expect(within(box()).getByRole("link", { name: "Comprar agora" })).toHaveClass("bg-shop-text")
    expect(within(box()).getByText("Você finaliza o pedido pelo WhatsApp da loja.")).toBeInTheDocument()
    expect(within(box()).getByRole("rowheader", { name: "Vendido por" })).toBeInTheDocument()
    expect(within(box()).getByRole("cell", { name: "Mutante Suplementos" })).toBeInTheDocument()
  })

  it("puts the chosen quantity in the cart, from 1 to 10", async () => {
    const user = userEvent.setup()
    const { onAdd } = renderBox()

    const quantity = within(box()).getByRole("combobox", { name: "Quantidade" })
    expect(within(quantity).getAllByRole("option")).toHaveLength(10)
    await user.selectOptions(quantity, "3")
    await user.click(within(box()).getByRole("button", { name: "Adicionar ao carrinho" }))

    expect(onAdd).toHaveBeenCalledWith(3)
    expect(screen.getByRole("status")).toHaveTextContent("Pré-Treino Haze foi adicionado ao carrinho.")
  })

  it("adds on the way to the cart with 'Comprar agora', and only once", async () => {
    const user = userEvent.setup()
    const { onAdd } = renderBox()

    const buyNow = within(box()).getByRole("link", { name: "Comprar agora" })
    expect(buyNow).toHaveAttribute("href", "/loja/carrinho")
    await user.click(within(box()).getByRole("button", { name: "Adicionar ao carrinho" }))
    buyNow.addEventListener("click", (event) => event.preventDefault())
    await user.click(buyNow)

    expect(onAdd).toHaveBeenCalledTimes(1)
  })

  it("says 'Esgotado' and offers 'Avise-me' instead of the pills when the combination ran out", async () => {
    const user = userEvent.setup()
    const onNotify = vi.fn()
    renderBox({ available: false, onNotify })

    expect(within(box()).getByText("Esgotado")).toHaveClass("text-shop-muted")
    expect(within(box()).getByText("Esta combinação acabou por enquanto.")).toBeInTheDocument()
    expect(within(box()).queryByRole("button", { name: "Adicionar ao carrinho" })).not.toBeInTheDocument()
    expect(within(box()).queryByRole("combobox")).not.toBeInTheDocument()
    await user.click(within(box()).getAllByRole("button", { name: "Avise-me quando chegar" })[0]!)

    expect(onNotify).toHaveBeenCalled()
  })

  it("hides only 'Em estoque' when the shop hides stock, never 'Esgotado'", () => {
    const { rerender } = renderBox({ showStock: false })
    expect(within(box()).queryByText("Em estoque")).not.toBeInTheDocument()

    rerender(<StorefrontProductPurchase name="x" priceCents={1} compareAtPriceCents={null} locale="pt-BR" showPrice available={false} choosing={false} showStock={false} />)
    expect(within(box()).getByText("Esgotado")).toBeInTheDocument()
  })

  it("says where the order finishes only for a shop on WhatsApp, and draws no price when the shop hides it", () => {
    renderBox({ finishesOnWhatsApp: false, showPrice: false })

    expect(screen.queryByText("Você finaliza o pedido pelo WhatsApp da loja.")).not.toBeInTheDocument()
    expect(screen.queryByText(/R\$/)).not.toBeInTheDocument()
  })

  it("writes the payment methods as 5b does, with credit and debit as one 'Cartão'", () => {
    renderBox()

    expect(within(box()).getByRole("cell", { name: "Pix · Cartão · Dinheiro" })).toBeInTheDocument()
  })

  it("leaves out the payment row when the shop lists none", () => {
    renderBox({ seller: { name: "Loja", paymentMethods: [] } })

    expect(within(box()).queryByRole("rowheader", { name: "Pagamento" })).not.toBeInTheDocument()
  })

  it("keeps the phone's bar hidden and out of reach until a script shows it", () => {
    renderBox()

    const bars = screen.getAllByRole("button", { name: "Adicionar ao carrinho", hidden: true })
    expect(bars).toHaveLength(2)
    expect(bars[1]!.closest("[inert]")).not.toBeNull()
  })

  it("has no accessibility violations", async () => {
    const { container } = renderBox()

    await expectNoA11yViolations(container)
  })
})
