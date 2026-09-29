// Libs
import { render, screen, waitFor, within } from "@testing-library/react"
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

  it("holds a refusal until the shopper closes it, and says when they do", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<StorefrontOrderCancel number={12} onConfirm={() => {}} onClose={onClose} error="Este pedido já foi cancelado." />)

    await user.click(screen.getByRole("button", { name: "Cancelar pedido" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Este pedido já foi cancelado.")
    expect(onClose).not.toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "Manter pedido" }))
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(onClose).toHaveBeenCalledOnce()
  })

  /** The redraw takes the button away, so focus would fall to the page's start; the order keeps it instead. */
  it("goes once the cancel lands, hands focus to the order around it, and stays shut", async () => {
    const user = userEvent.setup()
    const card = (done: boolean) => (
      <article tabIndex={-1} aria-label="Pedido nº 12">
        <StorefrontOrderCancel number={12} onConfirm={() => {}} done={done} />
      </article>
    )
    const { rerender } = render(card(false))

    await user.click(screen.getByRole("button", { name: "Cancelar pedido" }))
    await screen.findByRole("dialog")
    rerender(card(true))

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    await waitFor(() => expect(screen.getByRole("article", { name: "Pedido nº 12" })).toHaveFocus())
    expect(screen.getByRole("button", { name: "Cancelar pedido" })).toBeDisabled()
  })

  it("lands focus where the screen asks, once the cancel went through", async () => {
    const user = userEvent.setup()
    const Card = ({ done }: { done: boolean }) => (
      <>
        <p tabIndex={-1} id="aviso">
          Pedido nº 12 cancelado.
        </p>
        <article tabIndex={-1} aria-label="Pedido nº 12">
          <StorefrontOrderCancel number={12} onConfirm={() => {}} done={done} landingFocus={() => document.getElementById("aviso")} />
        </article>
      </>
    )
    const { rerender } = render(<Card done={false} />)

    await user.click(screen.getByRole("button", { name: "Cancelar pedido" }))
    await screen.findByRole("dialog")
    rerender(<Card done />)

    await waitFor(() => expect(screen.getByText("Pedido nº 12 cancelado.")).toHaveFocus())
  })

  it("has no accessibility violations, open", async () => {
    const user = userEvent.setup()
    const { baseElement } = render(<StorefrontOrderCancel number={12} onConfirm={() => {}} />)
    await user.click(screen.getByRole("button", { name: "Cancelar pedido" }))
    await screen.findByRole("dialog")
    await expectNoA11yViolations(baseElement)
  })
})
