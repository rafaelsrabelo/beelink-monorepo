// Libs
import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontCart, type StorefrontCartOffer } from "./storefront-cart"
import type { StorefrontCartRow } from "./storefront-cart-line"

const rows: StorefrontCartRow[] = [
  { key: "whey", name: "Whey", href: "/loja/produtos/whey", variantLabel: "Sabor: Chocolate · Peso: 900 g", imageUrl: null, unitPriceCents: 8990, qty: 2, lineTotalCents: 17980, available: true },
  { key: "uva", name: "Whey Uva", href: "/loja/produtos/whey", variantLabel: "Sabor: Uva", imageUrl: null, unitPriceCents: 8990, qty: 1, lineTotalCents: 8990, available: false },
]

const money = (text: string | null) => text?.replace(/\s/g, " ")

describe("StorefrontCart", () => {
  it("lists each line with its combination and total, and sums what can be ordered", () => {
    render(<StorefrontCart rows={rows} subtotalCents={17980} count={2} locale="pt-BR" continueHref="/loja/produtos" />)

    expect(screen.getByRole("link", { name: "Whey" })).toHaveAttribute("href", "/loja/produtos/whey")
    expect(screen.getByText("Sabor: Chocolate · Peso: 900 g")).toBeInTheDocument()
    expect(screen.getByText("Esgotado — não entra no pedido")).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 2, name: "Resumo do pedido" })).toBeInTheDocument()
    expect(screen.getByText(/Subtotal \(2 itens\)/)).toBeInTheDocument()
    expect(money(screen.getByText(/^R\$\s179,80$/, { selector: "dd" }).textContent)).toBe("R$ 179,80")
  })

  it("asks for a new quantity and for a line to go, by the line's key", () => {
    const onQtyChange = vi.fn()
    const onRemove = vi.fn()
    render(<StorefrontCart rows={rows} subtotalCents={17980} count={2} locale="pt-BR" continueHref="/loja/produtos" onQtyChange={onQtyChange} onRemove={onRemove} />)

    fireEvent.click(screen.getByRole("button", { name: "Aumentar a quantidade de Whey" }))
    fireEvent.click(screen.getByRole("button", { name: "Diminuir a quantidade de Whey" }))
    fireEvent.click(screen.getByRole("button", { name: "Remover Whey Uva do carrinho" }))

    expect(onQtyChange.mock.calls).toEqual([
      ["whey", 3],
      ["whey", 1],
    ])
    expect(onRemove).toHaveBeenCalledWith("uva")
    expect(screen.getByRole("button", { name: "Aumentar a quantidade de Whey Uva" })).toBeDisabled()
  })

  it("is a sentence and a way back when empty, saying what it took out", () => {
    render(<StorefrontCart rows={[]} subtotalCents={0} count={0} locale="pt-BR" continueHref="/loja/produtos" notice="Um produto saiu." />)

    expect(screen.getByText("Seu carrinho está vazio.")).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("Um produto saiu.")
    expect(screen.getByRole("link", { name: "Continuar comprando" })).toHaveAttribute("href", "/loja/produtos")
  })

  it("draws the way to close the order it is given, under the subtotal", () => {
    render(<StorefrontCart rows={rows} subtotalCents={17980} count={2} locale="pt-BR" continueHref="#" checkout={<a href="#fechar">Fechar pedido</a>} />)

    expect(screen.getByRole("complementary")).toContainElement(screen.getByRole("link", { name: "Fechar pedido" }))
  })

  /** BEELINK-178: the delivery's fee has its row, and the total stands under it. */
  it("says the delivery's fee on its own row, with the total under it", () => {
    render(<StorefrontCart rows={rows} subtotalCents={17980} count={2} delivery="R$ 5,00" total="R$ 184,80" locale="pt-BR" continueHref="#" />)

    const summary = screen.getByRole("complementary")
    expect(money(summary.querySelector("dl")?.textContent ?? null)).toBe("Subtotal (2 itens)R$ 179,80EntregaR$ 5,00TotalR$ 184,80")
  })

  /** BEELINK-194: the promotion and the coupon each have their row, and the total is what is left. */
  describe("priced with its discounts", () => {
    const discounts = [
      { key: "promotion", label: "Promoção: Semana do Whey", value: "− R$ 25,00" },
      { key: "coupon", label: "Cupom BEMVINDO10", value: "− R$ 17,50" },
    ]
    const priced = [{ ...rows[0]!, unitPriceCents: 8750, lineTotalCents: 17500, wasCents: 20000, promotion: "Semana do Whey" }, rows[1]!]

    it("says the subtotal, each discount on its own row, and the total under them", () => {
      render(<StorefrontCart rows={priced} subtotalCents={20000} count={2} discounts={discounts} total="R$ 157,50 + frete" locale="pt-BR" continueHref="#" />)

      const summary = screen.getByRole("complementary")
      const pairs = [...summary.querySelectorAll("dl > div")].map((row) => [row.querySelector("dt")!.textContent, money(row.querySelector("dd")!.textContent)])
      expect(pairs).toEqual([
        ["Subtotal (2 itens)", "R$ 200,00"],
        ["Promoção: Semana do Whey", "− R$ 25,00"],
        ["Cupom BEMVINDO10", "− R$ 17,50"],
        ["Total", "R$ 157,50 + frete"],
      ])
    })

    it("says which promotion took something off a line, and what the line cost before", () => {
      render(<StorefrontCart rows={priced} subtotalCents={20000} count={2} discounts={discounts} total="R$ 157,50" locale="pt-BR" continueHref="#" />)

      const line = screen.getByRole("link", { name: "Whey" }).closest("li")!
      expect(line).toHaveTextContent("Promoção: Semana do Whey")
      expect(money(line.querySelector("s")!.textContent)).toBe("De: R$ 200,00")
      // The sold-out line is not ordered: nothing was taken off it.
      expect(screen.getByRole("link", { name: "Whey Uva" }).closest("li")!.querySelector("s")).toBeNull()
    })

    it("is the subtotal alone with nothing taken off, as it always was", () => {
      render(<StorefrontCart rows={rows} subtotalCents={17980} count={2} locale="pt-BR" continueHref="#" />)

      expect(screen.getByRole("complementary").querySelectorAll("dl > div")).toHaveLength(1)
      expect(screen.queryByText("Total")).not.toBeInTheDocument()
    })

    it("waits as a skeleton while it is priced for the first time, and dims while it is priced again", () => {
      const { rerender } = render(<StorefrontCart rows={rows} subtotalCents={17980} count={2} pricing locale="pt-BR" continueHref="#" />)
      const list = screen.getByRole("complementary").querySelector("dl")!
      expect(list).toHaveAttribute("aria-busy", "true")
      expect(list).not.toHaveTextContent("179,80")

      rerender(<StorefrontCart rows={rows} subtotalCents={17980} count={2} discounts={discounts} total="R$ 137,30" stale locale="pt-BR" continueHref="#" />)
      expect(list).toHaveAttribute("aria-busy", "true")
      expect(list).toHaveClass("opacity-60")
      expect(list).toHaveTextContent("137,30")
    })

    it("has no accessibility violations", async () => {
      const { container } = render(<StorefrontCart rows={priced} subtotalCents={20000} count={2} discounts={discounts} total="R$ 157,50 + frete" locale="pt-BR" continueHref="#" />)

      await expectNoA11yViolations(container)
    })
  })

  /** BEELINK-245: a first-purchase promotion the cart did not get is announced under the totals, and is in none of them. */
  describe("with a first-purchase offer", () => {
    const open: StorefrontCartOffer = { tone: "open", text: "Boas-vindas: − R$ 26,97 na sua primeira compra. Entre na sua conta para confirmar." }
    const closed: StorefrontCartOffer = { tone: "closed", text: "Boas-vindas vale só na primeira compra." }

    it("announces one still open between the totals and the way to close the order, drawn to be noticed", () => {
      render(<StorefrontCart rows={rows} subtotalCents={17980} count={2} offer={open} locale="pt-BR" continueHref="#" checkout={<a href="#fechar">Fechar pedido</a>} />)

      const summary = screen.getByRole("complementary")
      const offer = within(summary).getByText(open.text)
      expect(summary.querySelector("dl")!.nextElementSibling).toBe(offer)
      expect(offer.nextElementSibling).toBe(screen.getByRole("link", { name: "Fechar pedido" }))
      expect(offer).toHaveClass("bg-shop-primary-tint")
      // Nothing was taken off: the subtotal stands alone, with no row and no total under it.
      expect(summary.querySelectorAll("dl > div")).toHaveLength(1)
    })

    /** BEELINK-243: what the order would earn, under the totals, as the quote worked it out. */
    it("says the cashback the order would earn, after the offer and before the way to close it", () => {
      render(<StorefrontCart rows={rows} subtotalCents={17980} count={2} cashback="Você ganha R$ 8,99 de cashback com este pedido." locale="pt-BR" continueHref="#" checkout={<a href="#fechar">Fechar pedido</a>} />)

      const line = within(screen.getByRole("complementary")).getByText("Você ganha R$ 8,99 de cashback com este pedido.")
      expect(line.nextElementSibling).toBe(screen.getByRole("link", { name: "Fechar pedido" }))
    })

    it("says quietly why one is not this customer's", () => {
      render(<StorefrontCart rows={rows} subtotalCents={17980} count={2} offer={closed} locale="pt-BR" continueHref="#" />)

      const offer = within(screen.getByRole("complementary")).getByText(closed.text)
      expect(offer).toHaveClass("text-shop-muted")
      expect(offer).not.toHaveClass("bg-shop-primary-tint")
    })

    it("is a plain paragraph: the cart's one status stays the product that left the shop", () => {
      render(<StorefrontCart rows={rows} subtotalCents={17980} count={2} offer={open} notice="Um produto saiu." locale="pt-BR" continueHref="#" />)

      const offer = screen.getByText(open.text)
      expect(offer.tagName).toBe("P")
      expect(offer).not.toHaveAttribute("aria-live")
      expect(screen.getByRole("status")).toHaveTextContent("Um produto saiu.")
      expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    })

    it("says nothing with none, and waits and dims with the amounts while the cart is priced", () => {
      const { rerender } = render(<StorefrontCart rows={rows} subtotalCents={17980} count={2} locale="pt-BR" continueHref="#" />)
      expect(screen.getByRole("complementary").querySelector("p")).toBeNull()

      rerender(<StorefrontCart rows={rows} subtotalCents={17980} count={2} offer={open} pricing locale="pt-BR" continueHref="#" />)
      expect(screen.queryByText(open.text)).not.toBeInTheDocument()

      rerender(<StorefrontCart rows={rows} subtotalCents={17980} count={2} offer={open} stale locale="pt-BR" continueHref="#" />)
      expect(screen.getByText(open.text)).toHaveClass("opacity-60")
    })

    it("has no accessibility violations, open or closed", async () => {
      const { container, rerender } = render(<StorefrontCart rows={rows} subtotalCents={17980} count={2} offer={open} locale="pt-BR" continueHref="#" />)
      await expectNoA11yViolations(container)

      rerender(<StorefrontCart rows={rows} subtotalCents={17980} count={2} offer={closed} locale="pt-BR" continueHref="#" />)
      await expectNoA11yViolations(container)
    })
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontCart rows={rows} subtotalCents={17980} count={2} locale="pt-BR" continueHref="/loja/produtos" />)

    await expectNoA11yViolations(container)
  })
})
