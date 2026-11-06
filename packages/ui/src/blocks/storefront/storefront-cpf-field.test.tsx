// Libs
import { fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontCpfField } from "./storefront-cpf-field"

/** The field as a screen holds it: the value it hands back is the value it is given. */
function Held({ start = "", onChange = () => {} }: { start?: string; onChange?: (value: string) => void }) {
  const [value, setValue] = useState(start)
  return (
    <StorefrontCpfField
      label="Seu CPF"
      hint="O pagamento online é feito no seu CPF."
      value={value}
      onChange={(next) => {
        setValue(next)
        onChange(next)
      }}
    />
  )
}

describe("StorefrontCpfField", () => {
  it("writes the CPF as 000.000.000-00 while it is typed, and hands the masked value back", () => {
    const onChange = vi.fn()
    render(<Held onChange={onChange} />)
    const field = screen.getByLabelText("Seu CPF")

    fireEvent.change(field, { target: { value: "529982" } })
    expect(field).toHaveValue("529.982")
    fireEvent.change(field, { target: { value: "52998224725" } })
    expect(field).toHaveValue("529.982.247-25")
    expect(onChange).toHaveBeenLastCalledWith("529.982.247-25")
    expect(field).toHaveAttribute("inputmode", "numeric")
  })

  it("reads a CPF pasted with words around it, and leaves out what is past the eleventh digit", () => {
    render(<Held />)
    const field = screen.getByLabelText("Seu CPF")

    fireEvent.change(field, { target: { value: "CPF: 529.982.247-25" } })
    expect(field).toHaveValue("529.982.247-25")
    fireEvent.change(field, { target: { value: "529.982.247-259" } })
    expect(field).toHaveValue("529.982.247-25")
  })

  it("says at once that eleven digits are no CPF, and stops saying it once they are one", () => {
    render(<Held />)
    const field = screen.getByLabelText("Seu CPF")

    fireEvent.change(field, { target: { value: "123.456.789-0" } })
    expect(screen.queryByRole("alert")).toBeNull()

    fireEvent.change(field, { target: { value: "123.456.789-00" } })
    expect(field).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByRole("alert")).toHaveTextContent("CPF inválido: confira os números digitados.")
    expect(field).toHaveAccessibleDescription(/CPF inválido/)

    fireEvent.change(field, { target: { value: "123.456.789-09" } })
    expect(field).not.toHaveAttribute("aria-invalid")
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("keeps the caret after the digit corrected in the middle", () => {
    render(<Held start="529.982.247-25" />)
    const field = screen.getByLabelText<HTMLInputElement>("Seu CPF")
    field.focus()

    // "529.98" with its 2 taken out and a 3 typed in its place, the caret after the 3.
    field.value = "529.983.247-25"
    field.setSelectionRange(6, 6)
    fireEvent.change(field)

    expect(field).toHaveValue("529.983.247-25")
    expect(field.selectionStart).toBe(6)
  })

  it("has no accessibility violations, with the warning or without it", async () => {
    const { container } = render(<Held start="529.982.247-25" />)
    await expectNoA11yViolations(container)

    fireEvent.change(screen.getByLabelText("Seu CPF"), { target: { value: "123.456.789-00" } })
    await expectNoA11yViolations(container)
  })
})
