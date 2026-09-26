// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { ButtonFields, buttonMissing, type ButtonValue } from "./button-fields"

function value(over: Partial<ButtonValue> = {}): ButtonValue {
  return { target: "NONE", categoryId: "", productId: "", externalUrl: "", buttonLabel: "", ...over }
}

function renderFields(current: ButtonValue) {
  const onChange = vi.fn()
  render(
    <ButtonFields value={current} onChange={onChange} categories={[{ id: "cat-1", name: "Blusas" }]} products={[{ id: "prod-1", name: "Whey" }]} />,
  )
  return { onChange }
}

describe("ButtonFields", () => {
  it("asks no words while the button leads nowhere: it is no button", () => {
    renderFields(value())

    expect(screen.queryByLabelText("Texto do botão")).not.toBeInTheDocument()
  })

  it("asks what the button says once it leads somewhere, and hands it back", async () => {
    const { onChange } = renderFields(value({ target: "PRODUCT", productId: "prod-1" }))

    await userEvent.type(screen.getByLabelText("Texto do botão"), "C")
    expect(onChange).toHaveBeenLastCalledWith({ buttonLabel: "C" })
  })

  it("says what Salvar waits for, where the button's words are", () => {
    renderFields(value({ target: "PRODUCT", productId: "prod-1" }))

    expect(screen.getByLabelText("Texto do botão")).toHaveAccessibleDescription("Escreva o texto do botão para salvar.")
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <main>
        <ButtonFields value={value({ target: "EXTERNAL", externalUrl: "https://x.com", buttonLabel: "Ver" })} onChange={vi.fn()} categories={[]} products={[]} />
      </main>,
    )

    await expectNoA11yViolations(container)
  })
})

describe("buttonMissing", () => {
  it("waits for the words, then for the destination, and never for a button to nowhere", () => {
    expect(buttonMissing(value())).toBeNull()
    expect(buttonMissing(value({ target: "PRODUCT", productId: "p" }))).toBe("label")
    expect(buttonMissing(value({ target: "PRODUCT", buttonLabel: "Comprar" }))).toBe("target")
    expect(buttonMissing(value({ target: "EXTERNAL", externalUrl: " ", buttonLabel: "Ver" }))).toBe("target")
    expect(buttonMissing(value({ target: "CATEGORY", categoryId: "c", buttonLabel: "Ver" }))).toBeNull()
  })
})
