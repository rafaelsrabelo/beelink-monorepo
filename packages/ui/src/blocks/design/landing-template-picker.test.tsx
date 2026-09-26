// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { LANDING_TEMPLATES, LandingTemplatePicker } from "./landing-template-picker"

describe("LandingTemplatePicker", () => {
  it("offers every template with what it builds, the chosen one checked", async () => {
    const onChange = vi.fn()
    render(<LandingTemplatePicker value="lancamento" onChange={onChange} available={LANDING_TEMPLATES} />)

    expect(screen.getByRole("radio", { name: /Lançamento de produto/ })).toBeChecked()
    await userEvent.click(screen.getByRole("radio", { name: /Promoção relâmpago/ }))
    expect(onChange).toHaveBeenCalledWith("promocao-relampago")
  })

  it("leaves a site only the blank page, and says why", () => {
    render(<LandingTemplatePicker value="em-branco" onChange={vi.fn()} available={["em-branco"]} />)

    expect(screen.getByRole("radio", { name: /Lançamento de produto/ })).toBeDisabled()
    expect(screen.getByRole("radio", { name: /Em branco/ })).toBeEnabled()
    expect(screen.getByText(/Um site começa em branco/)).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<LandingTemplatePicker value="colecao" onChange={vi.fn()} available={LANDING_TEMPLATES} />)

    await expectNoA11yViolations(container)
  })
})
