// Libs
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Locales
import { en } from "@harness-monorepo/ui/locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { CustomerList, type CustomerListProps } from "./customer-list"
import { customers } from "./customers.fixtures"

const hrefOf = (id: string) => `/admin/loja/customers/${id}`
const whatsappHrefOf: CustomerListProps["whatsappHrefOf"] = (customer) => (customer.phone ? `https://wa.me/${customer.phone}?text=${customer.stage}` : null)

function renderList(overrides: Partial<CustomerListProps> = {}) {
  return render(<CustomerList customers={customers} hrefOf={hrefOf} whatsappHrefOf={whatsappHrefOf} {...overrides} />)
}

/** The table's body rows, in order. */
function tableRows() {
  return within(screen.getByRole("table")).getAllByRole("row").slice(1)
}

describe("CustomerList", () => {
  it("heads the table with who, the stage, orders, total spent, last order and city", () => {
    renderList()

    expect(within(screen.getByRole("table")).getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual([
      "Cliente",
      "Estágio",
      "Pedidos",
      "Total gasto",
      "Último pedido",
      "Cidade/UF",
      "WhatsApp",
    ])
  })

  it("draws each customer with the stage, the orders, the spend to the cent, the last order and the place", () => {
    renderList()
    const [bia, caio, eva] = tableRows()

    expect(bia).toHaveTextContent("Bia Souza")
    expect(bia).toHaveTextContent("bia@exemplo.com · e-mail não confirmado")
    expect(bia).toHaveTextContent("Lead")
    expect(bia).toHaveTextContent("R$ 0,00")
    expect(bia).toHaveTextContent("São Paulo / SP")

    expect(caio).toHaveTextContent("Cliente")
    expect(caio).toHaveTextContent("3")
    expect(caio).toHaveTextContent("R$ 368,70")
    expect(caio).toHaveTextContent("20 de set.")
    expect(caio).toHaveTextContent("Campinas / SP")

    expect(eva).toHaveTextContent("R$ 89,90")
    expect(eva).toHaveTextContent("13 de jul.")
  })

  it("shows the e-mail under the name, or the phone when there is no e-mail", () => {
    renderList()
    const [bia, caio] = tableRows()

    expect(bia).not.toHaveTextContent("5511977776666")
    expect(caio).toHaveTextContent("5511955554444")
  })

  // The stage and the days come from the API with the same cut, so the list never recounts.
  it("says for how long an inactive customer has not bought, and only for them", () => {
    renderList()
    const [bia, caio, eva] = tableRows()

    expect(eva).toHaveTextContent("Inativo")
    expect(eva).toHaveTextContent("há 74 dias")
    expect(bia).not.toHaveTextContent("há ")
    expect(caio).not.toHaveTextContent("há ")
  })

  it("draws a dash for a last order that never happened and a place nobody gave", () => {
    renderList()
    const [bia, , eva] = tableRows()

    expect(within(bia!).getAllByRole("cell")[4]).toHaveTextContent("—")
    expect(within(eva!).getAllByRole("cell")[5]).toHaveTextContent("—")
  })

  it("opens a customer's record at its own page, the link named in full", () => {
    renderList()

    // The table's and the cards' — the one CSS does not hide is the one a person meets.
    const links = screen.getAllByRole("link", { name: "Abrir a ficha de Bia Souza" })
    expect(links).toHaveLength(2)
    for (const link of links) expect(link).toHaveAttribute("href", "/admin/loja/customers/c1")
  })

  it("opens the conversation on WhatsApp in a new tab, with the message for the customer's stage", () => {
    renderList()

    for (const link of screen.getAllByRole("link", { name: "Chamar no WhatsApp: Caio Lima" })) {
      expect(link).toHaveAttribute("href", "https://wa.me/5511955554444?text=CUSTOMER")
      expect(link).toHaveAttribute("target", "_blank")
    }
    expect(within(screen.getByRole("table")).getByRole("link", { name: "Chamar no WhatsApp: Bia Souza" })).toHaveTextContent(/^WhatsApp$/)
  })

  it("keeps the button for a customer with no phone, off, and says why", () => {
    renderList()

    const buttons = screen.getAllByRole("button", { name: "Chamar no WhatsApp: Eva Nunes" })
    expect(buttons).toHaveLength(2)
    for (const button of buttons) {
      expect(button).toBeDisabled()
      expect(button).toHaveAccessibleDescription("Sem celular")
    }
    expect(screen.queryByRole("link", { name: "Chamar no WhatsApp: Eva Nunes" })).not.toBeInTheDocument()
  })

  it("draws a card per customer on a phone, its numbers readable outside its one link", () => {
    renderList()
    const [bia, caio] = screen.getAllByRole("listitem")

    expect(within(caio!).getByRole("link", { name: "Abrir a ficha de Caio Lima" })).toHaveTextContent(/^Caio Lima$/)
    expect(caio).toHaveTextContent("3 pedidos · R$ 368,70")
    expect(caio).toHaveTextContent("Último pedido em 20 de set.")
    expect(caio).toHaveTextContent("Campinas / SP")
    expect(within(caio!).getByRole("link", { name: "Chamar no WhatsApp: Caio Lima" })).toHaveTextContent("Chamar no WhatsApp")

    expect(bia).toHaveTextContent("Nenhum pedido")
    expect(bia).not.toHaveTextContent("R$")
  })

  it("flags a possible duplicate under the stage, in the table and on the card, and nobody else", () => {
    renderList()
    const [bia, caio] = tableRows()
    const [biaCard, caioCard] = screen.getAllByRole("listitem")

    expect(within(bia!).getAllByRole("cell")[1]).toHaveTextContent("LeadPossível duplicado")
    expect(caio).not.toHaveTextContent("Possível duplicado")
    expect(biaCard).toHaveTextContent("Possível duplicado")
    expect(caioCard).not.toHaveTextContent("Possível duplicado")
  })

  it("says the year of a last order from another year", () => {
    renderList({ customers: [{ ...customers[1]!, lastOrderAt: "2024-03-02T15:00:00.000Z" }] })

    expect(tableRows()[0]).toHaveTextContent("2024")
  })

  it("says no one is here yet, no one matches a search, or no one is at a stage", () => {
    const { rerender } = renderList({ customers: [] })
    expect(screen.getByText("Nenhum cliente ainda.")).toBeInTheDocument()
    expect(screen.getByText(/aparece aqui na hora/)).toBeInTheDocument()

    rerender(<CustomerList customers={[]} searching stage="LEAD" hrefOf={hrefOf} whatsappHrefOf={whatsappHrefOf} />)
    expect(screen.getByText("Ninguém com essa busca.")).toBeInTheDocument()

    rerender(<CustomerList customers={[]} stage="INACTIVE" hrefOf={hrefOf} whatsappHrefOf={whatsappHrefOf} />)
    expect(screen.getByText("Ninguém nesse estágio agora.")).toBeInTheDocument()
    expect(screen.queryByText(/aparece aqui na hora/)).not.toBeInTheDocument()
  })

  it("speaks the panel's language", () => {
    renderList({ messages: en, locale: "en" })

    expect(screen.getAllByRole("link", { name: "Message on WhatsApp: Caio Lima" })).toHaveLength(2)
    expect(tableRows()[2]).toHaveTextContent("74 days ago")
  })

  it("has no accessibility violations", async () => {
    const { container } = renderList()

    await expectNoA11yViolations(container)
  })
})
