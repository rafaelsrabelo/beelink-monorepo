// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { LeadDetail } from "./lead-detail"
import { sampleLeads } from "./leads.fixtures"

const carlos = sampleLeads[0]!

describe("LeadDetail", () => {
  it("offers the ways to answer as links", () => {
    render(<LeadDetail lead={carlos} onStatusChange={vi.fn()} onDelete={vi.fn()} />)

    expect(screen.getByRole("link", { name: /carlos@obrassa.test/ })).toHaveAttribute("href", "mailto:carlos@obrassa.test")
    expect(screen.getByRole("link", { name: /WhatsApp/ })).toHaveAttribute("href", "https://wa.me/91988887777")
  })

  it("lists every answer under the label it was asked with", () => {
    render(<LeadDetail lead={carlos} onStatusChange={vi.fn()} onDelete={vi.fn()} />)

    expect(screen.getByText("Empresa")).toBeInTheDocument()
    expect(screen.getByText("Obras SA")).toBeInTheDocument()
  })

  it("says so when the form asked nothing else", () => {
    render(<LeadDetail lead={sampleLeads[1]!} onStatusChange={vi.fn()} onDelete={vi.fn()} />)

    expect(screen.getByText("Só o nome e o contato.")).toBeInTheDocument()
  })

  it("asks the screen to delete", async () => {
    const onDelete = vi.fn()
    render(<LeadDetail lead={carlos} onStatusChange={vi.fn()} onDelete={onDelete} />)

    await userEvent.click(screen.getByRole("button", { name: "Apagar contato" }))

    expect(onDelete).toHaveBeenCalled()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<LeadDetail lead={carlos} onStatusChange={vi.fn()} onDelete={vi.fn()} />)

    await expectNoA11yViolations(container)
  })
})
