// Libs
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { CountdownFields } from "./countdown-fields"

describe("CountdownFields", () => {
  it("asks when it ends on the shop's clock, and says so", () => {
    render(<CountdownFields value="2026-09-30T23:59" onChange={vi.fn()} />)

    const field = screen.getByLabelText("Termina em (horário de Brasília)")
    expect(field).toHaveValue("2026-09-30T23:59")
    expect(field).toHaveAccessibleDescription("Quando chegar a zero, a contagem some da loja.")
  })

  it("hands back the wall time typed", () => {
    const onChange = vi.fn()
    render(<CountdownFields value="" onChange={onChange} />)

    fireEvent.change(screen.getByLabelText("Termina em (horário de Brasília)"), { target: { value: "2026-10-05T18:00" } })
    expect(onChange).toHaveBeenCalledWith("2026-10-05T18:00")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <main>
        <CountdownFields value="2026-09-30T23:59" onChange={vi.fn()} />
      </main>,
    )

    await expectNoA11yViolations(container)
  })
})
