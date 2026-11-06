// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { ProductBulkBar } from "./product-bulk-bar"

const noop = () => {}

describe("ProductBulkBar", () => {
  it("draws nothing while nothing is chosen", () => {
    const { container } = render(<ProductBulkBar count={0} onActivate={noop} onDraft={noop} onClear={noop} />)

    expect(container).toBeEmptyDOMElement()
  })

  it("says how many are chosen, that the choice crosses pages, and acts on them", async () => {
    const onActivate = vi.fn()
    const onDraft = vi.fn()
    const onClear = vi.fn()
    const { container } = render(<ProductBulkBar count={30} onActivate={onActivate} onDraft={onDraft} onClear={onClear} />)

    expect(screen.getByText("30 produtos selecionados")).toBeInTheDocument()
    expect(screen.getByText("A seleção continua quando você troca de página.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Ativar" }))
    await userEvent.click(screen.getByRole("button", { name: "Mover para rascunho" }))
    await userEvent.click(screen.getByRole("button", { name: "Limpar seleção" }))
    expect([onActivate, onDraft, onClear].map((fn) => fn.mock.calls.length)).toEqual([1, 1, 1])
    await expectNoA11yViolations(container)
  })

  it("speaks of one in the singular", () => {
    render(<ProductBulkBar count={1} onActivate={noop} onDraft={noop} onClear={noop} />)

    expect(screen.getByText("1 produto selecionado")).toBeInTheDocument()
  })

  it("waits while one is on its way, and shows the refusal it was given", () => {
    render(<ProductBulkBar count={3} pending="ACTIVE" error="Um dos produtos não é mais da loja." onActivate={noop} onDraft={noop} onClear={noop} />)

    expect(screen.getByRole("button", { name: "Salvando…" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Mover para rascunho" })).toBeDisabled()
    expect(screen.getByRole("alert")).toHaveTextContent("Um dos produtos não é mais da loja.")
  })
})
