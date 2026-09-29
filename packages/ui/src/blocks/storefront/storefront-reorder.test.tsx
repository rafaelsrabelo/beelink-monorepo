// Libs
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontReorderButton } from "./storefront-reorder-button"
import { StorefrontReorderNotice } from "./storefront-reorder-notice"

describe("buying an order again", () => {
  /** A form, not a script: it works before the page's code has loaded. */
  it("posts to the shop's handler, from a card and from under an order's lines", () => {
    const { rerender } = render(<StorefrontReorderButton action="/loja/api/orders/14/reorder" />)
    const button = screen.getByRole("button", { name: "Comprar de novo" })
    expect(button).toHaveAttribute("type", "submit")
    expect(button.closest("form")).toHaveAttribute("action", "/loja/api/orders/14/reorder")
    expect(button.closest("form")).toHaveAttribute("method", "post")

    rerender(<StorefrontReorderButton action="/loja/api/orders/14/reorder" variant="all" />)
    expect(screen.getByRole("button", { name: "Comprar tudo de novo" })).toBeInTheDocument()
  })

  it("says in the cart which order the lines came from, and what stayed out", () => {
    render(<StorefrontReorderNotice number={14} outcome="added" left={["Whey (Sabor: Uva) — esgotado", "Creatina — só 1 disponível"]} />)

    const notice = screen.getByRole("status")
    expect(notice).toHaveTextContent("Os itens do pedido nº 14 estão no carrinho, com o preço de hoje.")
    expect(within(notice).getAllByRole("listitem").map((item) => item.textContent)).toEqual(["Whey (Sabor: Uva) — esgotado", "Creatina — só 1 disponível"])
  })

  it("says when nothing is on sale any more, and when the order could not be read", () => {
    const { rerender } = render(<StorefrontReorderNotice number={14} outcome="none" left={["Whey — não está mais à venda"]} />)
    expect(screen.getByRole("status")).toHaveTextContent("Nenhum item do pedido nº 14 está à venda agora.")

    rerender(<StorefrontReorderNotice number={14} outcome="failed" left={[]} />)
    expect(screen.getByRole("status")).toHaveTextContent("Não foi possível repetir o pedido nº 14 agora. Tente de novo.")
    expect(screen.queryByText("Ficaram de fora:")).toBeNull()
  })

  it("says when part of the order did not fit the cart", () => {
    render(<StorefrontReorderNotice number={14} outcome="added" left={[]} trimmed />)

    expect(screen.getByRole("status")).toHaveTextContent("O carrinho aceita até 50 itens, com até 99 unidades de cada: parte do pedido não coube.")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <>
        <StorefrontReorderNotice number={14} outcome="added" left={["Whey — esgotado"]} />
        <StorefrontReorderButton action="#" />
      </>,
    )
    await expectNoA11yViolations(container)
  })
})
