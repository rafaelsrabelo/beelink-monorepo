// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontOrderNow, type StorefrontOrderNowProps } from "./storefront-order-now"

const order: StorefrontOrderNowProps = {
  eyebrow: "Pedido nº 1042 · R$ 237,22 · Pix",
  headline: "Em preparo",
  destination: "Para Marina Souza · Rua Tibúrcio Cavalcante, 1200 — Fortaleza/CE",
  steps: [
    { label: "Pedido feito", when: "27 de set., 14:02", state: "done" },
    { label: "Em preparo", when: "28 de set., 09:00", state: "current" },
    { label: "Entregue", when: null, state: "todo" },
  ],
  href: "/loja/conta/pedidos?situacao=em-andamento",
}

describe("StorefrontOrderNow", () => {
  it("tells where the order stands, where it goes and its steps, with the way to follow it", () => {
    render(<StorefrontOrderNow {...order} />)

    expect(screen.getByRole("heading", { level: 2, name: "Pedido em andamento" })).toBeInTheDocument()
    expect(screen.getByText("Pedido nº 1042 · R$ 237,22 · Pix")).toBeInTheDocument()
    expect(screen.getByText("Em preparo", { selector: "p" })).toBeInTheDocument()
    expect(screen.getByText(/Para Marina Souza/)).toBeInTheDocument()
    expect(screen.getByRole("list", { name: "Etapas do pedido" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Acompanhar pedido" })).toHaveAttribute("href", "/loja/conta/pedidos?situacao=em-andamento")
  })

  it("points to the others on their way only when there are others", () => {
    const { rerender } = render(<StorefrontOrderNow {...order} />)
    expect(screen.queryByRole("link", { name: /Você tem mais/ })).toBeNull()

    rerender(<StorefrontOrderNow {...order} note="A loja confirma o pedido e o prazo." more={{ label: "Você tem mais 2 pedidos em andamento", href: "/loja/conta/pedidos?situacao=em-andamento" }} />)
    expect(screen.getByText("A loja confirma o pedido e o prazo.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Você tem mais 2 pedidos em andamento" })).toHaveAttribute("href", "/loja/conta/pedidos?situacao=em-andamento")
  })

  it("draws the other actions beside the way to follow it", () => {
    render(<StorefrontOrderNow {...order} actions={<a href="/loja/conta/conversas?pedido=1042">Falar com a loja</a>} />)
    expect(screen.getByRole("link", { name: "Falar com a loja" })).toHaveAttribute("href", "/loja/conta/conversas?pedido=1042")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontOrderNow {...order} more={{ label: "Você tem mais 1 pedido em andamento", href: "#" }} />)
    await expectNoA11yViolations(container)
  })
})
