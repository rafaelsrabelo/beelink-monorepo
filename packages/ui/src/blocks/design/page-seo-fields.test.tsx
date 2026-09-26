// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { PageSeoFields } from "./page-seo-fields"

const empty = { title: "", description: "", imageUrl: "" }

describe("PageSeoFields", () => {
  it("hands each field back on its own, and counts what a search result will show", async () => {
    const onChange = vi.fn()
    render(<PageSeoFields id="s" value={{ ...empty, title: "Ofertas" }} onChange={onChange} />)

    expect(screen.getByText("7/70")).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText("Descrição na busca"), "A")
    expect(onChange).toHaveBeenLastCalledWith({ title: "Ofertas", description: "A", imageUrl: "" })
  })

  it("stops at the length a search result shows", () => {
    render(<PageSeoFields id="s" value={empty} onChange={vi.fn()} />)

    expect(screen.getByLabelText("Título na busca")).toHaveAttribute("maxLength", "70")
    expect(screen.getByLabelText("Descrição na busca")).toHaveAttribute("maxLength", "160")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<PageSeoFields id="s" value={empty} onChange={vi.fn()} />)

    await expectNoA11yViolations(container)
  })
})
