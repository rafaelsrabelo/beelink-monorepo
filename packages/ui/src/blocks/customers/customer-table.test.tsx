// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { CustomerTable, type CustomerTableItem } from "./customer-table"

const bia: CustomerTableItem = {
  id: "c1",
  name: "Bia Souza",
  email: "bia@exemplo.com",
  emailVerified: false,
  phone: "5511977776666",
  city: "São Paulo",
  state: "SP",
  stage: "LEAD",
  createdAt: "2026-09-25T10:00:00.000Z",
}

describe("CustomerTable", () => {
  it("lists each customer with how to reach them, where they are and where they stand", () => {
    render(<CustomerTable customers={[bia]} />)

    expect(screen.getByRole("cell", { name: "Bia Souza" })).toBeInTheDocument()
    expect(screen.getByText(/bia@exemplo\.com/)).toHaveTextContent("e-mail não confirmado")
    expect(screen.getByText("5511977776666")).toBeInTheDocument()
    expect(screen.getByRole("cell", { name: "São Paulo / SP" })).toBeInTheDocument()
    expect(screen.getByText("Lead")).toBeInTheDocument()
  })

  it("draws no warning for a confirmed e-mail, and a dash for a customer with no city", () => {
    render(<CustomerTable customers={[{ ...bia, emailVerified: true, city: null, state: null, stage: "CUSTOMER" }]} />)

    expect(screen.queryByText(/não confirmado/)).not.toBeInTheDocument()
    expect(screen.getByRole("cell", { name: "—" })).toBeInTheDocument()
    expect(screen.getByText("Cliente")).toBeInTheDocument()
  })

  // The stage that comes from the shop's "inativo depois de N dias", in its own badge.
  it("marks a customer who stopped buying as inactive", () => {
    render(<CustomerTable customers={[{ ...bia, stage: "INACTIVE" }]} />)

    expect(screen.getByText("Inativo")).toBeInTheDocument()
  })

  it("says no one has an account yet, or that no one matches a search", () => {
    const { rerender } = render(<CustomerTable customers={[]} />)
    expect(screen.getByText("Nenhum cliente ainda.")).toBeInTheDocument()

    rerender(<CustomerTable customers={[]} searching />)
    expect(screen.getByText("Ninguém com essa busca.")).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<CustomerTable customers={[bia]} />)

    await expectNoA11yViolations(container)
  })
})
