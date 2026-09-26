// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontDeliverTo, cepAsWritten } from "./storefront-deliver-to"

describe("StorefrontDeliverTo", () => {
  it("invites a visitor with no CEP to give one, and promises nothing", () => {
    render(<StorefrontDeliverTo cep={null} onSave={vi.fn()} />)

    const button = screen.getByRole("button", { name: /Entregar em\s*Informe seu CEP/ })
    expect(button).toHaveAttribute("aria-expanded", "false")
    expect(document.body).not.toHaveTextContent(/prazo|frete|R\$/i)
  })

  it("keeps the CEP typed, written with its dash, and goes back to its button", async () => {
    const onSave = vi.fn()
    render(<StorefrontDeliverTo cep={null} onSave={onSave} />)

    await userEvent.click(screen.getByRole("button", { name: /Entregar em/ }))
    const field = screen.getByLabelText("Seu CEP")
    expect(field).toHaveFocus()
    expect(screen.getByRole("button", { name: "Usar este CEP" })).toBeDisabled()

    await userEvent.type(field, "01310930")
    expect(field).toHaveValue("01310-930")
    await userEvent.click(screen.getByRole("button", { name: "Usar este CEP" }))

    expect(onSave).toHaveBeenCalledWith("01310930")
    expect(screen.queryByLabelText("Seu CEP")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Entregar em/ })).toHaveFocus()
  })

  it("says the CEP kept, and closes on Escape with the focus back on its button", async () => {
    render(<StorefrontDeliverTo cep="01310930" onSave={vi.fn()} />)

    const button = screen.getByRole("button", { name: /Entregar em\s*01310-930/ })
    await userEvent.click(button)
    expect(screen.getByLabelText("Seu CEP")).toHaveValue("01310-930")
    await userEvent.keyboard("{Escape}")

    expect(screen.queryByLabelText("Seu CEP")).not.toBeInTheDocument()
    expect(button).toHaveFocus()
  })

  it("is drawn and does nothing with no way to save: design mode's preview", () => {
    render(<StorefrontDeliverTo cep={null} />)

    expect(screen.queryByRole("button")).not.toBeInTheDocument()
    expect(screen.getByText("Informe seu CEP")).toBeInTheDocument()
  })

  it("writes a CEP with its dash only once there is something after it", () => {
    expect(cepAsWritten("01310")).toBe("01310")
    expect(cepAsWritten("013109")).toBe("01310-9")
  })

  it("has no accessibility violations, open", async () => {
    const { container } = render(
      <main>
        <StorefrontDeliverTo cep={null} onSave={vi.fn()} />
      </main>,
    )
    await userEvent.click(screen.getByRole("button", { name: /Entregar em/ }))

    await expectNoA11yViolations(container)
  })
})
