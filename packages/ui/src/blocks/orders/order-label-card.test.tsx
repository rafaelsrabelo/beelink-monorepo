// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { OrderLabelCard, type OrderLabelCardProps } from "./order-label-card"
import { labelBlocked, labelBox, labelGenerated, labelToBuy } from "./order-label.fixtures"

function card(props: Partial<OrderLabelCardProps> = {}) {
  const handlers = { onChange: vi.fn(), onBuy: vi.fn(), onPrint: vi.fn(), onCancel: vi.fn() }
  const view = render(<OrderLabelCard view={labelToBuy} value={labelBox} {...handlers} {...props} />)
  return { ...view, ...handlers }
}

describe("OrderLabelCard (BEELINK-187)", () => {
  it("offers to buy the label for the box Melhor Envio worked out, saying the carrier and the wallet", async () => {
    const { onBuy, onChange, container } = card()

    expect(screen.getByRole("region", { name: "Etiqueta de envio" })).toHaveTextContent("Correios · SEDEX, pelo Melhor Envio da loja.")
    expect(screen.getByLabelText("Peso (g)")).toHaveValue("600")
    expect(screen.getByText("Saldo na carteira: R$ 100,00")).toBeInTheDocument()
    expect(screen.getByLabelText("Chave da nota fiscal (opcional)")).toHaveAccessibleDescription(/declaração de conteúdo/)

    await userEvent.type(screen.getByLabelText("Altura (cm)"), "1")
    expect(onChange).toHaveBeenLastCalledWith({ ...labelBox, height: "81" })
    await userEvent.click(screen.getByRole("button", { name: "Comprar etiqueta" }))
    expect(onBuy).toHaveBeenCalledOnce()
    await expectNoA11yViolations(container)
  })

  it("says what stands in the way, with where to fix it, and offers nothing to buy", () => {
    card({ view: labelBlocked })

    expect(screen.getByText("Informe o CPF ou CNPJ da loja, que vai como remetente.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Abrir Integrações" })).toHaveAttribute("href", "/admin/loja/integrations")
    expect(screen.queryByRole("button", { name: "Comprar etiqueta" })).toBeNull()
  })

  it("says the wallet is short with the way to Melhor Envio, and tries again from the cart", async () => {
    const { onBuy } = card({
      view: { ...labelToBuy, label: { status: "IN_CART", statusText: "No carrinho do Melhor Envio, esperando o pagamento de R$ 27,45.", protocol: null, trackingCode: null } },
      error: { text: "Saldo insuficiente.", href: "https://sandbox.melhorenvio.com.br", linkLabel: "Abrir o Melhor Envio", external: true },
    })

    expect(screen.getByRole("alert")).toHaveTextContent("Saldo insuficiente.")
    expect(screen.getByRole("link", { name: "Abrir o Melhor Envio" })).toHaveAttribute("target", "_blank")
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }))
    expect(onBuy).toHaveBeenCalledOnce()
  })

  it("shows a generated label's tracking, prints it, and cancels only once asked again", async () => {
    const { onPrint, onCancel, container } = card({ view: labelGenerated })

    expect(screen.getByText("ME23002OWZ7BR")).toBeInTheDocument()
    expect(screen.queryByLabelText("Peso (g)")).toBeNull()
    await userEvent.click(screen.getByRole("button", { name: "Imprimir etiqueta" }))
    expect(onPrint).toHaveBeenCalledOnce()

    await userEvent.click(screen.getByRole("button", { name: "Cancelar etiqueta" }))
    expect(onCancel).not.toHaveBeenCalled()
    expect(screen.getByRole("alertdialog")).toHaveTextContent("O valor volta à carteira do Melhor Envio em até 12 horas.")
    await userEvent.click(screen.getByRole("button", { name: "Cancelar etiqueta" }))
    expect(onCancel).toHaveBeenCalledOnce()
    await expectNoA11yViolations(container)
  })

  it("generates a paid label that was not generated", async () => {
    const { onBuy } = card({ view: { ...labelToBuy, label: { status: "PAID", statusText: "Paga (R$ 27,45), mas ainda não gerada.", protocol: null, trackingCode: null } } })

    await userEvent.click(screen.getByRole("button", { name: "Gerar etiqueta" }))
    expect(onBuy).toHaveBeenCalledOnce()
  })

  it("buys another after a cancellation", () => {
    card({ view: { ...labelToBuy, label: { status: "CANCELLED", statusText: "Cancelada em 2 de out.", protocol: null, trackingCode: null } } })

    expect(screen.getByRole("button", { name: "Comprar etiqueta" })).toBeEnabled()
    expect(screen.queryByRole("button", { name: "Cancelar etiqueta" })).toBeNull()
  })
})
