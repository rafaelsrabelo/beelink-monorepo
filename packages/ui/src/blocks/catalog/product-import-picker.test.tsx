// Libs
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { ProductImportPicker } from "./product-import-picker"

const menu = () => new File(["%PDF-1.7"], "cardapio.pdf", { type: "application/pdf" })

describe("ProductImportPicker", () => {
  it("hands over the file chosen through the button, and says what it accepts", async () => {
    const onPick = vi.fn()
    const { container } = render(<ProductImportPicker onPick={onPick} />)

    const button = screen.getByRole("button", { name: "Escolher arquivo" })
    expect(button).toHaveAccessibleDescription(/PDF ou foto do cardápio/)

    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!
    const file = menu()
    await userEvent.upload(input, file)

    expect(onPick).toHaveBeenCalledWith(file)
    await expectNoA11yViolations(container)
  })

  it("takes a file dropped on the box", () => {
    const onPick = vi.fn()
    const { container } = render(<ProductImportPicker onPick={onPick} />)
    const file = menu()

    fireEvent.drop(container.firstElementChild!.firstElementChild!, { dataTransfer: { files: [file] } })

    expect(onPick).toHaveBeenCalledWith(file)
  })

  it("takes nothing while disabled, and shows the refusal it was given", () => {
    const onPick = vi.fn()
    const { container } = render(<ProductImportPicker onPick={onPick} disabled error="Esse arquivo não é aceito." />)

    fireEvent.drop(container.firstElementChild!.firstElementChild!, { dataTransfer: { files: [menu()] } })

    expect(onPick).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "Escolher arquivo" })).toBeDisabled()
    expect(screen.getByRole("alert")).toHaveTextContent("Esse arquivo não é aceito.")
  })
})
