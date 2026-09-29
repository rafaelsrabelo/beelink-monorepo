// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontOrderReceipt, type StorefrontOrderReceiptProps } from "./storefront-order-receipt"

const receipt: StorefrontOrderReceiptProps = {
  shop: { name: "Loja do Design", address: "Rua B, 20 — Centro · Fortaleza · CE" },
  number: 14,
  placedOn: "28 de set. de 2026, 23:13",
  customer: "Cliente Teste",
  handover: { title: "Retirada na loja", lines: ["Rua B, 20 — Centro · Fortaleza · CE"] },
  items: [{ name: "Molotov 300g", meta: "Qtd. 1", price: "R$ 39,90" }],
  rows: [{ label: "Subtotal", value: "R$ 39,90" }],
  total: "R$ 39,90",
  method: "Pagamento combinado com a loja: Pix",
  backHref: "/loja/conta/pedidos/14",
}

describe("StorefrontOrderReceipt", () => {
  it("says who sold what to whom, for how much, and that it is not a tax invoice", () => {
    render(<StorefrontOrderReceipt {...receipt} />)

    expect(screen.getByRole("heading", { level: 1, name: "Comprovante do pedido nº 14" })).toBeInTheDocument()
    expect(screen.getByText("Loja do Design")).toBeInTheDocument()
    expect(screen.getByText("Cliente Teste")).toBeInTheDocument()
    expect(screen.getByText("Molotov 300g")).toBeInTheDocument()
    expect(screen.getByText("Total").nextElementSibling).toHaveTextContent("R$ 39,90")
    expect(screen.getByText("Este comprovante não é nota fiscal.")).toBeInTheDocument()
  })

  /** On paper the button and the way back are noise: the browser's print styles drop them. */
  it("leads back to the order and prints, keeping both off the paper", () => {
    render(<StorefrontOrderReceipt {...receipt} />)

    const back = screen.getByRole("link", { name: "Voltar ao pedido" })
    expect(back).toHaveAttribute("href", "/loja/conta/pedidos/14")
    expect(back.closest(".print\\:hidden")).not.toBeNull()
    expect(screen.getByRole("button", { name: "Imprimir" }).closest(".print\\:hidden")).not.toBeNull()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontOrderReceipt {...receipt} />)
    await expectNoA11yViolations(container)
  })
})
