// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { DesignLeaveDialog } from "./design-leave-dialog"

describe("DesignLeaveDialog", () => {
  it("asks before the arrangement is thrown away, staying by default", async () => {
    const onStay = vi.fn()
    const onLeave = vi.fn()
    render(<DesignLeaveDialog open onStay={onStay} onLeave={onLeave} />)

    expect(screen.getByRole("alertdialog", { name: "Sair sem publicar?" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Continuar editando" }))
    expect(onStay).toHaveBeenCalled()
    await userEvent.click(screen.getByRole("button", { name: "Sair sem publicar" }))
    expect(onLeave).toHaveBeenCalled()
  })

  it("has no accessibility violations", async () => {
    const { baseElement } = render(<DesignLeaveDialog open onStay={vi.fn()} onLeave={vi.fn()} />)
    await expectNoA11yViolations(baseElement)
  })
})
