// Libs
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StoreCustomersFields } from "./store-customers-fields"

describe("StoreCustomersFields", () => {
  it("asks after how many days a customer turns inactive, and says what it changes", () => {
    render(<StoreCustomersFields value={{ inactiveAfterDays: 60 }} onChange={vi.fn()} />)

    expect(screen.getByRole("spinbutton", { name: "Cliente vira inativo depois de" })).toHaveValue(60)
    expect(screen.getByText("dias sem comprar")).toBeInTheDocument()
    expect(screen.getByText(/aparece como Inativo em Clientes/)).toBeInTheDocument()
  })

  it("hands back the number typed", () => {
    const onChange = vi.fn()
    render(<StoreCustomersFields value={{ inactiveAfterDays: 60 }} onChange={onChange} />)

    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "90" } })

    expect(onChange).toHaveBeenCalledWith({ inactiveAfterDays: 90 })
  })

  // An emptied box is not a number: the form's schema refuses it in words, where zero would pass as data.
  it("hands back an emptied box as not a number, never as zero", () => {
    const onChange = vi.fn()
    render(<StoreCustomersFields value={{ inactiveAfterDays: 60 }} onChange={onChange} />)

    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "" } })

    expect(Number.isNaN(onChange.mock.calls[0]?.[0].inactiveAfterDays)).toBe(true)
  })

  it("marks the field and says the bounds when the number is out of them", () => {
    render(<StoreCustomersFields value={{ inactiveAfterDays: 3 }} onChange={vi.fn()} error={{ message: "Um número de 7 a 365 dias" }} />)

    expect(screen.getByRole("spinbutton")).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByText("Um número de 7 a 365 dias")).toBeInTheDocument()
  })

  it("speaks the panel's language", () => {
    render(<StoreCustomersFields value={{ inactiveAfterDays: 60 }} onChange={vi.fn()} messages={en} />)

    expect(screen.getByRole("group", { name: en.store.customers.legend })).toBeInTheDocument()
    expect(screen.getByRole("spinbutton", { name: en.store.customers.inactiveAfterDays })).toBeInTheDocument()
  })

  it("has no accessibility violations, with an error too", async () => {
    const { container } = render(
      <StoreCustomersFields value={{ inactiveAfterDays: 3 }} onChange={vi.fn()} error={{ message: "Um número de 7 a 365 dias" }} />,
    )

    await expectNoA11yViolations(container)
  })
})
