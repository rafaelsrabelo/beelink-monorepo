// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { PageDisplayFields } from "./page-display-fields"

describe("PageDisplayFields", () => {
  it("turns the menu link and the shop's frame on and off, each on its own", async () => {
    const onChange = vi.fn()
    render(<PageDisplayFields id="d" value={{ inMenu: false, usesChrome: true }} onChange={onChange} />)

    await userEvent.click(screen.getByRole("switch", { name: "Mostrar nos links da loja" }))
    expect(onChange).toHaveBeenLastCalledWith({ inMenu: true, usesChrome: true })

    await userEvent.click(screen.getByRole("switch", { name: "Usar o topo e o rodapé da loja" }))
    expect(onChange).toHaveBeenLastCalledWith({ inMenu: false, usesChrome: false })
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<PageDisplayFields id="d" value={{ inMenu: true, usesChrome: false }} onChange={vi.fn()} />)

    await expectNoA11yViolations(container)
  })
})
