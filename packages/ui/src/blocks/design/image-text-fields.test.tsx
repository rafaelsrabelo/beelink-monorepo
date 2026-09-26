// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { ImageTextFields, type ImageTextValue } from "./image-text-fields"

function value(over: Partial<ImageTextValue> = {}): ImageTextValue {
  return { imageUrl: "", imageAlt: "", target: "NONE", categoryId: "", productId: "", externalUrl: "", buttonLabel: "", ...over }
}

describe("ImageTextFields", () => {
  it("asks what the picture shows only once there is a picture", () => {
    const { rerender } = render(<ImageTextFields value={value()} onChange={vi.fn()} categories={[]} products={[]} />)
    expect(screen.queryByLabelText("Descrição da imagem")).not.toBeInTheDocument()

    rerender(<ImageTextFields value={value({ imageUrl: "https://cdn.example/a.png" })} onChange={vi.fn()} categories={[]} products={[]} />)
    expect(screen.getByLabelText("Descrição da imagem")).toHaveAccessibleDescription(/Em branco, ela só enfeita/)
  })

  it("hands back what the picture shows", async () => {
    const onChange = vi.fn()
    render(<ImageTextFields value={value({ imageUrl: "https://cdn.example/a.png" })} onChange={onChange} categories={[]} products={[]} />)

    await userEvent.type(screen.getByLabelText("Descrição da imagem"), "B")
    expect(onChange).toHaveBeenLastCalledWith({ imageAlt: "B" })
  })

  it("offers a button that leads nowhere until told otherwise, once there is a picture to put it beside", () => {
    const { rerender } = render(<ImageTextFields value={value()} onChange={vi.fn()} categories={[]} products={[]} />)
    expect(screen.queryByRole("combobox", { name: "Para onde leva" })).not.toBeInTheDocument()

    rerender(<ImageTextFields value={value({ imageUrl: "https://cdn.example/a.png" })} onChange={vi.fn()} categories={[]} products={[]} />)
    expect(screen.getByRole("combobox", { name: "Para onde leva" })).toHaveTextContent("Nenhum")
    expect(screen.queryByLabelText("Texto do botão")).not.toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <main>
        <ImageTextFields value={value({ imageUrl: "https://cdn.example/a.png", imageAlt: "Uma bolsa" })} onChange={vi.fn()} categories={[]} products={[]} />
      </main>,
    )

    await expectNoA11yViolations(container)
  })
})
