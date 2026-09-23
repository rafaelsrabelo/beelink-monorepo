// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { LeadTable } from "./lead-table"
import { sampleLeads } from "./leads.fixtures"

describe("LeadTable", () => {
  it("opens a lead from its name, named for a screen reader", async () => {
    const onOpen = vi.fn()
    render(<LeadTable leads={sampleLeads} onOpen={onOpen} onStatusChange={vi.fn()} />)

    await userEvent.click(screen.getByRole("button", { name: "Abrir contato de Carlos Lima" }))

    expect(onOpen).toHaveBeenCalledWith("1")
  })

  it("names each row's status after the person", () => {
    render(<LeadTable leads={sampleLeads} onOpen={vi.fn()} onStatusChange={vi.fn()} />)

    expect(screen.getByRole("combobox", { name: "Status de Marina Souza" })).toHaveTextContent("Em conversa")
  })

  it('tells "none yet" from "none with this status"', () => {
    const { rerender } = render(<LeadTable leads={[]} onOpen={vi.fn()} onStatusChange={vi.fn()} />)
    expect(screen.getByText("Nenhum contato ainda.")).toBeInTheDocument()

    rerender(<LeadTable leads={[]} filtered onOpen={vi.fn()} onStatusChange={vi.fn()} />)
    expect(screen.getByText("Nenhum contato com esse status.")).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<LeadTable leads={sampleLeads} onOpen={vi.fn()} onStatusChange={vi.fn()} />)

    await expectNoA11yViolations(container)
  })
})
