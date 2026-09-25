// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { ComponentTextFields } from "./component-text-fields"

const empty = { title: "", subtitle: "", body: "" }

describe("ComponentTextFields", () => {
  it("asks a heading for its title and the line under it, and no paragraph", () => {
    render(<ComponentTextFields kind="HEADING" value={empty} onChange={vi.fn()} />)

    expect(screen.getByLabelText("Título")).toBeInTheDocument()
    expect(screen.getByLabelText("Linha de apoio")).toBeInTheDocument()
    expect(screen.queryByLabelText("Texto")).not.toBeInTheDocument()
  })

  it("asks a paragraph for its text and nothing a heading has", () => {
    render(<ComponentTextFields kind="TEXT" value={empty} onChange={vi.fn()} />)

    expect(screen.getByLabelText("Texto")).toBeInTheDocument()
    expect(screen.queryByLabelText("Título")).not.toBeInTheDocument()
  })

  it("asks a banner nothing: its words are on its pictures", () => {
    const { container } = render(<ComponentTextFields kind="BANNER" value={empty} onChange={vi.fn()} />)

    expect(container).toBeEmptyDOMElement()
  })

  it("hands back only the word that changed", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ComponentTextFields kind="HEADING" value={empty} onChange={onChange} />)

    await user.type(screen.getByLabelText("Título"), "N")

    expect(onChange).toHaveBeenCalledWith({ title: "N" })
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <ComponentTextFields kind="CONTACT" value={{ title: "Fale conosco", subtitle: "", body: "" }} onChange={vi.fn()} />,
    )

    await expectNoA11yViolations(container)
  })
})
