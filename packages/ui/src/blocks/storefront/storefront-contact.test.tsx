// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontContact, type StorefrontContactField } from "./storefront-contact"

const fields: StorefrontContactField[] = [
  { id: "email", label: "E-mail", type: "EMAIL", required: true },
  { id: "empresa", label: "Empresa", type: "TEXT", required: false },
  { id: "volume", label: "Volume", type: "SELECT", required: false, options: ["Até 10t", "Mais de 10t"] },
]

describe("StorefrontContact", () => {
  it("asks the name first, then the owner's questions, marking the optional ones", () => {
    render(<StorefrontContact fields={fields} onSubmit={vi.fn()} />)

    expect(screen.getByLabelText("Seu nome")).toBeRequired()
    expect(screen.getByLabelText("E-mail")).toHaveAttribute("type", "email")
    expect(screen.getByLabelText(/Empresa/)).toHaveAccessibleName(/Empresa\s*\(opcional\)/)
  })

  it("hands over the name and the answers by field id, leaving blanks out", async () => {
    const onSubmit = vi.fn()
    render(<StorefrontContact fields={fields} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText("Seu nome"), "Carlos Lima")
    await userEvent.type(screen.getByLabelText("E-mail"), "carlos@exemplo.test")
    await userEvent.selectOptions(screen.getByLabelText(/Volume/), "Mais de 10t")
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }))

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Carlos Lima",
      answers: { email: "carlos@exemplo.test", volume: "Mais de 10t" },
      website: "",
    })
  })

  /** The trap: out of sight and out of reach, so a person never fills it. */
  it("keeps the trap away from people", () => {
    const { container } = render(<StorefrontContact fields={fields} onSubmit={vi.fn()} />)
    const trap = container.querySelector('input[name="website"]')

    expect(trap).toHaveAttribute("tabindex", "-1")
    expect(trap?.closest('[aria-hidden="true"]')).not.toBeNull()
  })

  it("replaces the form with the thank-you once sent", () => {
    render(<StorefrontContact fields={fields} status="sent" onSubmit={vi.fn()} />)

    expect(screen.getByRole("status")).toHaveTextContent("Mensagem enviada")
    expect(screen.queryByRole("button", { name: "Enviar" })).not.toBeInTheDocument()
  })

  it("says what went wrong under the button", () => {
    render(<StorefrontContact fields={fields} error="Confira os campos." onSubmit={vi.fn()} />)

    expect(screen.getByRole("alert")).toHaveTextContent("Confira os campos.")
  })

  /** Design mode's preview draws the form and must never send a lead. */
  it("sends nothing without a handler", () => {
    render(<StorefrontContact fields={fields} />)

    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontContact title="Fale com a gente" fields={fields} whatsappHref="https://wa.me/1" onSubmit={vi.fn()} />)

    await expectNoA11yViolations(container)
  })
})
