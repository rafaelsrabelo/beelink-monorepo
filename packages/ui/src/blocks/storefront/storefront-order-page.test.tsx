// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontOrderAddress } from "./storefront-order-address"
import { StorefrontOrderHeader } from "./storefront-order-header"
import { StorefrontOrderHistory } from "./storefront-order-history"
import { StorefrontOrderItems } from "./storefront-order-items"
import { StorefrontOrderLayout } from "./storefront-order-layout"
import { StorefrontOrderPayment } from "./storefront-order-payment"
import { StorefrontOrderStatus } from "./storefront-order-status"
import { StorefrontPrintButton } from "./storefront-print-button"

const header = (
  <StorefrontOrderHeader
    number={14}
    placed="Feito por você na loja em 28 de set. de 2026, 23:13."
    trail={[
      { label: "Minha conta", href: "/loja/conta" },
      { label: "Meus pedidos", href: "/loja/conta/pedidos" },
    ]}
    homeHref="/loja"
    backHref="/loja/conta/pedidos"
    receiptHref="/loja/conta/pedidos/14?comprovante=1"
    actions={<button type="button">Cancelar pedido</button>}
  />
)

const steps = [
  { label: "Pedido feito", when: "28 de set., 23:13", state: "done" as const },
  { label: "Loja confirmou", when: "29 de set., 09:00", state: "current" as const },
  { label: "Em preparo", when: null, state: "todo" as const },
]

function page() {
  return (
    <StorefrontOrderLayout
      header={header}
      status={<StorefrontOrderStatus headline="A loja confirmou o pedido" detail="Atualizado em 29 de set., 09:00" tone="progress" steps={steps} />}
      history={<StorefrontOrderHistory events={[{ day: "29 de set.", time: "09:00", title: "Loja confirmou", detail: null }, { day: "28 de set.", time: "23:13", title: "Pedido feito", detail: "Feito por você na loja" }]} />}
      aside={
        <>
          <StorefrontOrderItems count={3} items={[{ name: "Molotov 300g", href: "/loja/produtos/molotov", imageUrl: null, meta: "Qtd. 2 · R$ 39,90 cada", price: "R$ 79,80" }, { name: "Boné", href: null, imageUrl: null, meta: "Qtd. 1", price: "R$ 20,00" }]} />
          <StorefrontOrderPayment rows={[{ label: "Subtotal", value: "R$ 99,80" }, { label: "Entrega", value: "Grátis", positive: true }]} total="R$ 99,80" method="Pagamento combinado com a loja: Pix" />
          <StorefrontOrderAddress title="Endereço de entrega" lines={["Marina Souza", "Rua A, 10, apto 2", "Centro — Fortaleza/CE — CEP 60000-000"]} />
        </>
      }
    />
  )
}

describe("an order's page", () => {
  /** BEELINK-243: the payment card says where the order's cashback stands, under how it was paid. */
  it("says the order's cashback under the way it was paid, and nothing without one", async () => {
    const { container, rerender } = render(<StorefrontOrderPayment rows={[{ label: "Subtotal", value: "R$ 99,80" }]} total="R$ 99,80" method="Pagamento combinado com a loja: Pix" cashback="Você vai ganhar R$ 4,99 de cashback quando o pedido for entregue." />)
    expect(screen.getByText("Pagamento combinado com a loja: Pix").nextElementSibling).toHaveTextContent("Você vai ganhar R$ 4,99 de cashback quando o pedido for entregue.")
    await expectNoA11yViolations(container)

    rerender(<StorefrontOrderPayment rows={[{ label: "Subtotal", value: "R$ 99,80" }]} total="R$ 99,80" method="Pagamento combinado com a loja: Pix" />)
    expect(screen.getByText("Pagamento combinado com a loja: Pix").nextElementSibling).toBeNull()
  })

  it("titles the order, says who placed it, and trails back to the list", () => {
    render(header)

    expect(screen.getByRole("heading", { level: 1, name: "Pedido nº 14" })).toBeInTheDocument()
    expect(screen.getByText("Feito por você na loja em 28 de set. de 2026, 23:13.")).toBeInTheDocument()
    const trail = screen.getByRole("navigation")
    expect(within(trail).getByRole("link", { name: "Meus pedidos" })).toHaveAttribute("href", "/loja/conta/pedidos")
    expect(within(trail).getByText("Pedido nº 14")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ver comprovante" })).toHaveAttribute("href", "/loja/conta/pedidos/14?comprovante=1")
    expect(screen.getByRole("button", { name: "Cancelar pedido" })).toBeInTheDocument()
  })

  it("draws where it stands, its steps, the history newest first, the lines, the sums and where it goes", () => {
    render(page())

    expect(screen.getByRole("heading", { level: 2, name: "A loja confirmou o pedido" })).toBeInTheDocument()
    expect(screen.getByRole("list", { name: "Etapas do pedido" })).toBeInTheDocument()
    const history = screen.getByRole("heading", { name: "Histórico" }).closest("section")!
    expect(within(history).getAllByRole("listitem").map((item) => item.textContent)).toEqual(["29 de set.09:00Loja confirmou", "28 de set.23:13Pedido feitoFeito por você na loja"])
    expect(screen.getByRole("heading", { name: "Itens (3)" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Molotov 300g" })).toHaveAttribute("href", "/loja/produtos/molotov")
    expect(screen.queryByRole("link", { name: "Boné" })).toBeNull()
    expect(screen.getByText("Total").nextElementSibling).toHaveTextContent("R$ 99,80")
    expect(screen.getByText("Pagamento combinado com a loja: Pix")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Endereço de entrega" })).toBeInTheDocument()
  })

  /** 6f: on a phone what was bought and where it goes come before the log; from shop-lg the column moves right. */
  it("puts the lines, the payment and the address before the history in the page's order", () => {
    render(page())

    const items = screen.getByRole("heading", { name: "Itens (3)" })
    const history = screen.getByRole("heading", { name: "Histórico" })
    expect(items.compareDocumentPosition(history) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("titles an order it could not read, with the way back and nothing it does not know", () => {
    render(<StorefrontOrderHeader number={14} trail={[{ label: "Meus pedidos", href: "/loja/conta/pedidos" }]} homeHref="/loja" backHref="/loja/conta/pedidos" />)

    expect(screen.getByRole("heading", { level: 1, name: "Pedido nº 14" })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Ver comprovante" })).toBeNull()
  })

  it("draws no steps for a cancelled order, which says when and by whom", () => {
    render(<StorefrontOrderStatus headline="Cancelado em 28 de set. de 2026" detail="Cancelado por você" tone="cancelled" steps={null} />)

    expect(screen.getByRole("heading", { name: "Cancelado em 28 de set. de 2026" })).toBeInTheDocument()
    expect(screen.queryByRole("list")).toBeNull()
  })

  it("prints from the browser's own dialog", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {})
    render(<StorefrontPrintButton />)

    await userEvent.click(screen.getByRole("button", { name: "Imprimir" }))
    expect(print).toHaveBeenCalledOnce()
    print.mockRestore()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(page())
    await expectNoA11yViolations(container)
  })
})
