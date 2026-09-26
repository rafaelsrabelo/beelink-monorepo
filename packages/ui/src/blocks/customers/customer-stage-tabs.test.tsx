// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "@harness-monorepo/ui/locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { CustomerStageTabs, type CustomerStageTabsProps } from "./customer-stage-tabs"

const counts = { LEAD: 5, CUSTOMER: 3, INACTIVE: 2 }

function renderTabs(overrides: Partial<CustomerStageTabsProps> = {}) {
  const onValueChange = vi.fn()
  const view = render(
    <CustomerStageTabs value={null} onValueChange={onValueChange} counts={counts} {...overrides}>
      <p>A lista</p>
    </CustomerStageTabs>,
  )
  return { onValueChange, ...view }
}

describe("CustomerStageTabs", () => {
  it("draws Todos · Leads · Clientes · Inativos with how many there are, Todos being their sum", () => {
    renderTabs()

    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Todos 10", "Leads 5", "Clientes 3", "Inativos 2"])
    expect(screen.getByRole("tablist", { name: "Filtrar por estágio" })).toBeInTheDocument()
  })

  it("marks the chosen stage and shows the list in the panel it controls", () => {
    renderTabs({ value: "INACTIVE" })

    expect(screen.getByRole("tab", { name: "Inativos 2" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("tab", { name: "Todos 10" })).toHaveAttribute("aria-selected", "false")
    expect(screen.getByRole("tabpanel")).toHaveTextContent("A lista")
  })

  it("tells the screen the stage picked, and no stage for Todos", async () => {
    const user = userEvent.setup()
    const { onValueChange, rerender } = renderTabs()

    await user.click(screen.getByRole("tab", { name: "Leads 5" }))
    expect(onValueChange).toHaveBeenLastCalledWith("LEAD")

    rerender(
      <CustomerStageTabs value="LEAD" onValueChange={onValueChange} counts={counts}>
        <p>A lista</p>
      </CustomerStageTabs>,
    )
    await user.click(screen.getByRole("tab", { name: "Todos 10" }))
    expect(onValueChange).toHaveBeenLastCalledWith(null)
  })

  it("says no number before the first answer arrives", () => {
    renderTabs({ counts: undefined })

    expect(screen.getAllByRole("tab").map((tab) => tab.textContent?.trim())).toEqual(["Todos", "Leads", "Clientes", "Inativos"])
  })

  it("speaks the panel's language", () => {
    renderTabs({ messages: en })

    expect(screen.getByRole("tab", { name: "Customers 3" })).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = renderTabs({ value: "LEAD" })

    await expectNoA11yViolations(container)
  })
})
