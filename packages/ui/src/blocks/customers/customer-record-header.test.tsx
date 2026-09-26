// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Locales
import { en } from "@harness-monorepo/ui/locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { CustomerRecordHeader, type CustomerRecordHeaderProps } from "./customer-record-header"
import { customerRecord, customers } from "./customers.fixtures"

const props: CustomerRecordHeaderProps = {
  customer: customerRecord,
  backHref: "/admin/loja/customers",
  newOrderHref: "/admin/loja/orders/new?customer=c2",
  whatsappHref: "https://wa.me/5511955554444?text=Oi",
}

describe("CustomerRecordHeader", () => {
  it("names the customer, where they stand and since when they are on the shop's list", () => {
    render(<CustomerRecordHeader {...props} />)

    expect(screen.getByRole("heading", { level: 1, name: "Caio Lima" })).toBeInTheDocument()
    expect(screen.getByText("Cliente")).toBeInTheDocument()
    expect(screen.getByText("Na loja desde 2 de jun. de 2026")).toBeInTheDocument()
  })

  it("says for how long an inactive customer has not bought", () => {
    render(<CustomerRecordHeader {...props} customer={{ ...customers[2]!, createdAt: customerRecord.createdAt }} />)

    expect(screen.getByText("Inativo")).toBeInTheDocument()
    expect(screen.getByText("há 74 dias")).toBeInTheDocument()
  })

  it("leads back to the list, to a new order made out to the customer, and to WhatsApp in a new tab", () => {
    render(<CustomerRecordHeader {...props} />)

    expect(screen.getByRole("link", { name: "Clientes" })).toHaveAttribute("href", "/admin/loja/customers")
    expect(screen.getByRole("link", { name: "Novo pedido" })).toHaveAttribute("href", "/admin/loja/orders/new?customer=c2")
    const whatsapp = screen.getByRole("link", { name: "Chamar no WhatsApp: Caio Lima" })
    expect(whatsapp).toHaveAttribute("href", "https://wa.me/5511955554444?text=Oi")
    expect(whatsapp).toHaveAttribute("target", "_blank")
  })

  it("keeps the WhatsApp button for a customer with no phone, off, and says why", () => {
    render(<CustomerRecordHeader {...props} whatsappHref={null} />)

    const button = screen.getByRole("button", { name: "Chamar no WhatsApp: Caio Lima" })
    expect(button).toBeDisabled()
    expect(button).toHaveAccessibleDescription("Sem celular")
  })

  it("speaks the panel's language", () => {
    render(<CustomerRecordHeader {...props} locale="en" messages={en} />)

    expect(screen.getByText("At the shop since Jun 2, 2026")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "New order" })).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<CustomerRecordHeader {...props} whatsappHref={null} />)

    await expectNoA11yViolations(container)
  })
})
