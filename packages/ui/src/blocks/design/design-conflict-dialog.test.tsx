// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { DesignConflictDialog } from "./design-conflict-dialog"

describe("DesignConflictDialog", () => {
  it("says another tab changed the page, and offers only to reload", async () => {
    const onReload = vi.fn()
    render(<DesignConflictDialog open onReload={onReload} />)

    const dialog = await screen.findByRole("alertdialog", { name: "Outra aba alterou esta página" })
    expect(screen.getAllByRole("button")).toHaveLength(1)
    await userEvent.click(screen.getByRole("button", { name: "Recarregar" }))
    expect(onReload).toHaveBeenCalledTimes(1)
    expect(dialog).toBeInTheDocument()
  })

  it("cannot be dismissed with Escape into a screen that can no longer save", async () => {
    render(<DesignConflictDialog open onReload={vi.fn()} />)

    await screen.findByRole("alertdialog")
    await userEvent.keyboard("{Escape}")
    expect(screen.getByRole("alertdialog")).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    render(<DesignConflictDialog open onReload={vi.fn()} />)

    await expectNoA11yViolations(await screen.findByRole("alertdialog"))
  })
})
