// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { ContactFieldsField, reachesBack, type ContactFieldValue } from "./contact-fields-field"

const email: ContactFieldValue = { id: "email", label: "E-mail", type: "EMAIL", required: true, options: "" }
const volume: ContactFieldValue = { id: "vol", label: "Volume", type: "SELECT", required: false, options: "Até 10t" }

describe("ContactFieldsField", () => {
  it("draws each question with its label", () => {
    render(<ContactFieldsField value={[email]} onChange={vi.fn()} newFieldId={() => "x"} />)

    expect(screen.getByLabelText("Pergunta")).toHaveValue("E-mail")
    expect(screen.getByRole("checkbox", { name: "Obrigatório" })).toBeChecked()
  })

  it("asks for the choices only on a list", () => {
    render(<ContactFieldsField value={[email, volume]} onChange={vi.fn()} newFieldId={() => "x"} />)

    expect(screen.getAllByLabelText("Opções")).toHaveLength(1)
  })

  it("adds an empty short-text question with the id the screen mints", async () => {
    const onChange = vi.fn()
    render(<ContactFieldsField value={[email]} onChange={onChange} newFieldId={() => "novo"} />)

    await userEvent.click(screen.getByRole("button", { name: "Adicionar campo" }))

    expect(onChange).toHaveBeenCalledWith([email, { id: "novo", label: "", type: "TEXT", required: false, options: "" }])
  })

  it("names the bin after the question it removes", async () => {
    const onChange = vi.fn()
    render(<ContactFieldsField value={[email, volume]} onChange={onChange} newFieldId={() => "x"} />)

    await userEvent.click(screen.getByRole("button", { name: "Remover campo: Volume" }))

    expect(onChange).toHaveBeenCalledWith([email])
  })

  /** The API refuses this form; the warning says why before the owner presses save. */
  it("warns when no required e-mail or phone is left", () => {
    render(<ContactFieldsField value={[volume]} onChange={vi.fn()} newFieldId={() => "x"} />)

    expect(screen.getByRole("alert")).toHaveTextContent(/e-mail ou telefone/)
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<ContactFieldsField value={[email, volume]} onChange={vi.fn()} newFieldId={() => "x"} />)

    await expectNoA11yViolations(container)
  })
})

describe("reachesBack", () => {
  it("is true only for a required e-mail or phone", () => {
    expect(reachesBack([{ type: "PHONE", required: true }])).toBe(true)
    expect(reachesBack([{ type: "EMAIL", required: false }])).toBe(false)
    expect(reachesBack([{ type: "TEXT", required: true }])).toBe(false)
  })
})
