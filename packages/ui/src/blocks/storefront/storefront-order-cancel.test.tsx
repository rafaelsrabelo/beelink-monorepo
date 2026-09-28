// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontOrderCancel } from "./storefront-order-cancel"

describe("StorefrontOrderCancel", () => {
  it("asks before cancelling, names the order, and only then tells the page", async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<StorefrontOrderCancel number={1042} onConfirm={onConfirm} />)

    await user.click(screen.getByRole("button", { name: "Cancelar pedido" }))
    expect(await screen.findByRole("dialog", { name: "Cancelar o pedido nº 1042?" })).toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "Manter pedido" }))
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(onConfirm).not.toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "Cancelar pedido" }))
    // The dialog's own button, apart from the card's of the same name.
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Cancelar pedido" }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it("holds the dialog while the cancel is on its way, and shows the refusal it is given", async () => {
    const user = userEvent.setup()
    const { rerender } = render(<StorefrontOrderCancel number={12} onConfirm={() => {}} pending />)

    await user.click(screen.getByRole("button", { name: "Cancelar pedido" }))
    expect(await screen.findByRole("button", { name: "Cancelando…" })).toBeDisabled()

    rerender(<StorefrontOrderCancel number={12} onConfirm={() => {}} error="A loja já aceitou este pedido. Para cancelar, fale com a loja." />)
    expect(screen.getByRole("alert")).toHaveTextContent("A loja já aceitou este pedido.")
  })

  it("has no accessibility violations, open", async () => {
    const user = userEvent.setup()
    const { baseElement } = render(<StorefrontOrderCancel number={12} onConfirm={() => {}} />)
    await user.click(screen.getByRole("button", { name: "Cancelar pedido" }))
    await screen.findByRole("dialog")
    await expectNoA11yViolations(baseElement)
  })
})
