// Libs
import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontZipCodeField, type StorefrontZipCodeFieldProps, type StorefrontZipCodeLookup } from "./storefront-zip-code-field"

const meireles: StorefrontZipCodeLookup = { status: "found", street: "Rua Tibúrcio Cavalcante", neighborhood: "Meireles", city: "Fortaleza", state: "CE" }

function zipField(props: Partial<StorefrontZipCodeFieldProps> = {}) {
  return <StorefrontZipCodeField defaultValue={null} onFound={() => {}} inputClassName="" labelClassName="" {...props} />
}

describe("StorefrontZipCodeField", () => {
  it("looks the CEP up on its eighth digit, masked as it is typed, and hands over what was found", async () => {
    const onLookup = vi.fn(async () => meireles)
    const onFound = vi.fn()
    render(zipField({ onLookup, onFound }))

    await userEvent.type(screen.getByLabelText("CEP"), "6016023")
    expect(screen.getByLabelText("CEP")).toHaveValue("60160-23")
    expect(onLookup).not.toHaveBeenCalled()

    await userEvent.type(screen.getByLabelText("CEP"), "0")
    expect(screen.getByLabelText("CEP")).toHaveValue("60160-230")
    expect(onLookup).toHaveBeenCalledExactlyOnceWith("60160230")
    expect(onFound).toHaveBeenCalledWith({ status: "found", street: "Rua Tibúrcio Cavalcante", neighborhood: "Meireles", city: "Fortaleza", state: "CE" })
    expect(screen.getByRole("status")).toBeEmptyDOMElement()
  })

  /** A pasted CEP with a dot, or with letters around it, is the same eight digits. */
  it("keeps the digits of a pasted CEP alone", async () => {
    const onLookup = vi.fn(async () => meireles)
    render(zipField({ onLookup }))

    await userEvent.click(screen.getByLabelText("CEP"))
    await userEvent.paste("60.160-230")
    expect(screen.getByLabelText("CEP")).toHaveValue("60160-230")
    expect(onLookup).toHaveBeenCalledWith("60160230")
  })

  it("says a CEP too short is invalid, on leaving the field or on a press, without asking anyone", async () => {
    const onLookup = vi.fn(async () => meireles)
    render(
      <>
        {zipField({ onLookup })}
        <button type="button">depois</button>
      </>,
    )

    await userEvent.type(screen.getByLabelText("CEP"), "6016")
    await userEvent.click(screen.getByRole("button", { name: "depois" }))
    expect(screen.getByRole("status")).toHaveTextContent("CEP inválido: são 8 números, como 60160-230.")

    await userEvent.click(screen.getByRole("button", { name: "Buscar CEP" }))
    expect(screen.getByLabelText("CEP")).toHaveFocus()
    expect(onLookup).not.toHaveBeenCalled()
  })

  it("says a CEP nobody knows, one refused as invalid and the service not answering, each in its own words, back on the field", async () => {
    const onLookup = vi
      .fn<(zipCode: string) => Promise<StorefrontZipCodeLookup>>()
      .mockResolvedValueOnce({ status: "not-found" })
      .mockResolvedValueOnce({ status: "invalid" })
      .mockResolvedValueOnce({ status: "unavailable" })
    const onFound = vi.fn()
    render(zipField({ onLookup, onFound }))

    await userEvent.type(screen.getByLabelText("CEP"), "99999999")
    expect(screen.getByRole("status")).toHaveTextContent("Não achamos esse CEP. Confira os números ou preencha o endereço.")
    expect(screen.getByLabelText("CEP")).toHaveFocus()

    await userEvent.click(screen.getByRole("button", { name: "Buscar CEP" }))
    expect(screen.getByRole("status")).toHaveTextContent("CEP inválido")

    await userEvent.click(screen.getByRole("button", { name: "Buscar CEP" }))
    expect(screen.getByRole("status")).toHaveTextContent("Não deu para buscar o CEP agora. Preencha o endereço.")
    expect(onLookup).toHaveBeenCalledTimes(3)
    expect(onFound).not.toHaveBeenCalled()
  })

  /** An answer about a CEP the shopper already changed would write the wrong street into the form. */
  it("drops the answer to a CEP changed while it was being looked up", async () => {
    let answer: (lookup: StorefrontZipCodeLookup) => void = () => {}
    const onLookup = vi.fn(() => new Promise<StorefrontZipCodeLookup>((resolve) => (answer = resolve)))
    const onFound = vi.fn()
    render(zipField({ onLookup, onFound }))

    await userEvent.type(screen.getByLabelText("CEP"), "60160230")
    expect(screen.getByRole("button", { name: "Buscando…" })).toHaveAttribute("aria-busy", "true")
    await userEvent.type(screen.getByLabelText("CEP"), "{Backspace}")
    expect(screen.getByRole("button", { name: "Buscar CEP" })).not.toHaveAttribute("aria-busy")
    await act(async () => answer(meireles))

    expect(onFound).not.toHaveBeenCalled()
    expect(screen.getByRole("status")).toBeEmptyDOMElement()
  })

  it("starts from the CEP on file, masked, and offers no lookup without one to call", () => {
    render(zipField({ defaultValue: "60160230" }))

    expect(screen.getByLabelText("CEP")).toHaveValue("60160-230")
    expect(screen.getByLabelText("CEP")).toBeRequired()
    expect(screen.getByLabelText("CEP")).toHaveAttribute("inputmode", "numeric")
    expect(screen.queryByRole("button", { name: "Buscar CEP" })).toBeNull()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(zipField({ onLookup: async () => ({ status: "not-found" }) }))
    await userEvent.type(screen.getByLabelText("CEP"), "99999999")
    await expectNoA11yViolations(container)
  })

  it("tells the form the address is to be typed when the CEP is unknown or the service is down — never for one too short", async () => {
    const onMissed = vi.fn()
    const onLookup = vi.fn<(zipCode: string) => Promise<StorefrontZipCodeLookup>>().mockResolvedValueOnce({ status: "not-found" }).mockResolvedValueOnce({ status: "unavailable" })
    render(zipField({ onLookup, onMissed }))

    await userEvent.click(screen.getByRole("button", { name: "Buscar CEP" }))
    expect(onMissed).not.toHaveBeenCalled()

    await userEvent.type(screen.getByLabelText("CEP"), "99999999")
    expect(onMissed).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByRole("button", { name: "Buscar CEP" }))
    expect(onMissed).toHaveBeenCalledTimes(2)
  })
})
