// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { AdminSearch } from "./admin-search"

describe("AdminSearch", () => {
  it("names the field without a visible label, which the header has no room for", () => {
    render(<AdminSearch />)

    expect(screen.getByLabelText("Pesquisar na loja")).toBeInTheDocument()
  })

  // A lone input swallows Enter. The form is what makes the search reachable by keyboard at all.
  it("submits on Enter, with what was typed", async () => {
    const onSubmit = vi.fn()
    render(<AdminSearch onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText("Pesquisar na loja"), "blusa{Enter}")

    expect(onSubmit).toHaveBeenCalledWith("blusa")
  })

  it("reports every keystroke, so the screen owns the term", async () => {
    const onValueChange = vi.fn()
    render(<AdminSearch onValueChange={onValueChange} />)

    await userEvent.type(screen.getByLabelText("Pesquisar na loja"), "ab")

    expect(onValueChange).toHaveBeenCalledTimes(2)
  })

  /*
    The hint a person sees is decorative and the one a machine reads is ARIA's own token syntax.
    Asserting on aria-keyshortcuts rather than on the glyph is the point: the glyph is ⌘ or Ctrl
    depending on the platform, and it is chosen after mount so the server and the browser agree.
  */
  it("declares the shortcut in the form a machine reads, for both platforms", () => {
    render(<AdminSearch />)

    expect(screen.getByLabelText("Pesquisar na loja")).toHaveAttribute(
      "aria-keyshortcuts",
      "Control+K Meta+K",
    )
  })

  it("takes focus on the shortcut from anywhere on the page", async () => {
    render(<AdminSearch />)
    const field = screen.getByLabelText("Pesquisar na loja")
    expect(field).not.toHaveFocus()

    await userEvent.keyboard("{Control>}k{/Control}")

    expect(field).toHaveFocus()
  })

  it("speaks the other language", () => {
    render(<AdminSearch messages={en} />)

    expect(screen.getByLabelText("Search this shop")).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<AdminSearch />)

    await expectNoA11yViolations(container)
  })
})
