// Libs
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontAccountCashback, type StorefrontAccountCashbackProps } from "./storefront-account-cashback"

const full: StorefrontAccountCashbackProps = {
  balance: "R$ 15,00",
  pending: "R$ 4,70",
  expiry: "R$ 5,00 vencem em 10/11/2026",
  rule: "Nesta loja, 5% do valor dos produtos volta como cashback quando o pedido é entregue.",
  credits: [
    { key: "c1", origin: "Pedido nº 12", amount: "R$ 5,00", left: null, when: "Vence em 10/11/2026" },
    { key: "c2", origin: "Crédito da loja", amount: "R$ 10,00", left: "Restam R$ 10,00 de R$ 20,00", when: "Não vence" },
  ],
  entries: [
    { key: "e1", label: "Usado", detail: "Pedido nº 14", amount: "− R$ 10,00", positive: false, date: "2 de out. de 2026" },
    { key: "e2", label: "Ganho", detail: "Pedido nº 12", amount: "+ R$ 5,00", positive: true, date: "1 de out. de 2026" },
  ],
}

describe("StorefrontAccountCashback", () => {
  it("says what the shopper can spend, what is pending and what expires first", () => {
    render(<StorefrontAccountCashback {...full} />)

    expect(screen.getByText("Saldo para usar")).toBeInTheDocument()
    expect(screen.getByText("R$ 15,00")).toBeInTheDocument()
    expect(screen.getByText("R$ 5,00 vencem em 10/11/2026")).toBeInTheDocument()
    expect(screen.getByText("R$ 4,70")).toBeInTheDocument()
    expect(screen.getByText(/não é dinheiro/)).toBeInTheDocument()
  })

  it("lists the credits and the statement, each under its heading", () => {
    render(<StorefrontAccountCashback {...full} />)

    const credits = screen.getByRole("region", { name: "Seus créditos" })
    expect(within(credits).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Pedido nº 12Vence em 10/11/2026R$ 5,00",
      "Crédito da lojaNão venceR$ 10,00Restam R$ 10,00 de R$ 20,00",
    ])
    const statement = screen.getByRole("region", { name: "Extrato" })
    expect(within(statement).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "UsadoPedido nº 14 · 2 de out. de 2026− R$ 10,00",
      "GanhoPedido nº 12 · 1 de out. de 2026+ R$ 5,00",
    ])
  })

  it("says the shopper has none yet, and leaves out what has nothing to show", () => {
    render(<StorefrontAccountCashback balance="R$ 0,00" pending={null} expiry={null} rule={null} credits={[]} entries={[]} />)

    expect(screen.getByText("Você ainda não tem cashback nesta loja.")).toBeInTheDocument()
    expect(screen.queryByText("Pendente")).toBeNull()
    expect(screen.queryByRole("region", { name: "Seus créditos" })).toBeNull()
  })

  it("has no a11y violations", async () => {
    const { container } = render(<StorefrontAccountCashback {...full} />)

    await expectNoA11yViolations(container)
  })
})
