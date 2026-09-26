// Libs
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

// Locales
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { CustomerAddressInputs } from "./customer-address-inputs"

const value = { zipCode: "01310-930", street: "Av. Paulista", number: "1000", complement: "", neighborhood: "Bela Vista", city: "São Paulo", state: "SP" }

describe("CustomerAddressInputs", () => {
  it("draws every part in the order a person writes an address, each capped where the API caps it", () => {
    render(<CustomerAddressInputs idPrefix="a" value={value} onChange={() => {}} messages={ptBR} />)

    expect(screen.getAllByRole("textbox").map((input) => input.getAttribute("maxlength"))).toEqual(["9", "160", "20", "80", "80", "80", "2"])
    expect(screen.getByLabelText("Rua")).toHaveValue("Av. Paulista")
    expect(screen.getByLabelText("UF")).toHaveValue("SP")
  })

  it("hands back the whole address with the part that changed", () => {
    const onChange = vi.fn()
    render(<CustomerAddressInputs idPrefix="a" value={value} onChange={onChange} messages={ptBR} />)

    fireEvent.change(screen.getByLabelText("Número"), { target: { value: "12" } })

    expect(onChange).toHaveBeenCalledWith({ ...value, number: "12" })
  })

  it("ties a refused CEP or UF to its input", () => {
    render(
      <CustomerAddressInputs
        idPrefix="a"
        value={value}
        onChange={() => {}}
        issues={{ zipCode: ptBR.orders.form.zipCodeInvalid }}
        messages={ptBR}
      />,
    )

    expect(screen.getByLabelText("CEP")).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByLabelText("CEP")).toHaveAccessibleDescription("O CEP tem 8 dígitos.")
    expect(screen.getByLabelText("UF")).not.toHaveAttribute("aria-invalid")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<CustomerAddressInputs idPrefix="a" value={value} onChange={() => {}} issues={{ state: ptBR.orders.form.stateInvalid }} messages={ptBR} />)

    await expectNoA11yViolations(container)
  })
})
