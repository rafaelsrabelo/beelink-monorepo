// Libs
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { ProductOrderFooter } from "./product-order-footer"

const noop = () => {}

describe("ProductOrderFooter", () => {
  it("offers nothing to save or undo until something moved", () => {
    render(<ProductOrderFooter dirty={false} onSave={noop} onUndo={noop} />)

    expect(screen.getByRole("button", { name: "Salvar ordem" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Desfazer" })).toBeDisabled()
  })

  it("saves and undoes once something moved, and says it is not saved yet", async () => {
    const onSave = vi.fn()
    const onUndo = vi.fn()
    const { container } = render(<ProductOrderFooter dirty onSave={onSave} onUndo={onUndo} />)

    expect(screen.getByText("A nova ordem ainda não foi salva.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Salvar ordem" }))
    await userEvent.click(screen.getByRole("button", { name: "Desfazer" }))
    expect(onSave).toHaveBeenCalledOnce()
    expect(onUndo).toHaveBeenCalledOnce()
    await expectNoA11yViolations(container)
  })

  it("goes quiet while saving", () => {
    render(<ProductOrderFooter dirty pending onSave={noop} onUndo={noop} />)

    expect(screen.getByRole("button", { name: "Salvando…" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Desfazer" })).toBeDisabled()
  })

  it("says the save went through, and a refusal over the reminder it would only repeat", () => {
    const { rerender } = render(<ProductOrderFooter dirty={false} saved onSave={noop} onUndo={noop} />)
    expect(screen.getByText("Ordem salva. A loja já mostra assim.")).toBeInTheDocument()

    rerender(<ProductOrderFooter dirty error="A lista mudou." onSave={noop} onUndo={noop} />)
    expect(screen.getByRole("alert")).toHaveTextContent("A lista mudou.")
    expect(screen.queryByText("A nova ordem ainda não foi salva.")).not.toBeInTheDocument()
  })

  it("asks before leaving with the order unsaved, and staying is the answer Enter gives", async () => {
    const onStay = vi.fn()
    const onLeave = vi.fn()
    render(<ProductOrderFooter dirty onSave={noop} onUndo={noop} leaving onStay={onStay} onLeave={onLeave} />)

    const stay = screen.getByRole("button", { name: "Continuar ordenando" })
    await waitFor(() => expect(stay).toHaveFocus())
    await userEvent.click(stay)
    expect(onStay).toHaveBeenCalledOnce()
    expect(onLeave).not.toHaveBeenCalled()
  })

  it("leaves when told to", async () => {
    const onLeave = vi.fn()
    render(<ProductOrderFooter dirty onSave={noop} onUndo={noop} leaving onStay={noop} onLeave={onLeave} />)

    await userEvent.click(screen.getByRole("button", { name: "Sair sem salvar" }))
    expect(onLeave).toHaveBeenCalledOnce()
  })
})
