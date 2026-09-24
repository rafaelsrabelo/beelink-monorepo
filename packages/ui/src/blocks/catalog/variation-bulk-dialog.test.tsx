// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { VariationBulkDialog } from "./variation-bulk-dialog"

describe("VariationBulkDialog", () => {
  it("applies the value typed, on Enter, without submitting the form it sits in", async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    const outer = vi.fn((event: React.FormEvent) => event.preventDefault())
    render(
      <form onSubmit={outer}>
        <VariationBulkDialog title="Definir estoque das 2 selecionadas" label="Estoque" inputMode="numeric" onApply={onApply} onClose={() => {}} />
      </form>,
    )

    await user.type(await screen.findByRole("textbox", { name: "Estoque" }), " 12 {Enter}")

    expect(onApply).toHaveBeenCalledWith("12")
    expect(outer).not.toHaveBeenCalled()
  })

  it("stays closed without a title, and closes on Cancelar", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const { rerender } = render(
      <VariationBulkDialog title={null} label="Preço" inputMode="decimal" onApply={() => {}} onClose={onClose} />,
    )
    expect(screen.queryByRole("dialog")).toBeNull()

    rerender(<VariationBulkDialog title="Mesmo preço" label="Preço" inputMode="decimal" onApply={() => {}} onClose={onClose} />)
    const dialog = await screen.findByRole("dialog", { name: "Mesmo preço" })
    await expectNoA11yViolations(dialog)
    await user.click(screen.getAllByRole("button", { name: "Cancelar" })[0]!)

    expect(onClose).toHaveBeenCalled()
  })
})
