// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { isLandingTemplate, LandingTemplatePicker } from "./landing-template-picker"
import { SHOP_LANDINGS, SITE_LANDINGS } from "./landing-template.fixtures"

describe("LandingTemplatePicker", () => {
  it("offers every template it is handed, in that order, with what it builds, the chosen one checked", async () => {
    const onChange = vi.fn()
    render(<LandingTemplatePicker value="lancamento" onChange={onChange} templates={SHOP_LANDINGS} />)

    expect(screen.getAllByRole("radio").map((radio) => radio.getAttribute("value"))).toEqual(["lancamento", "promocao-relampago", "colecao", "em-branco"])
    expect(screen.getByRole("radio", { name: /Lançamento de produto/ })).toBeChecked()
    await userEvent.click(screen.getByRole("radio", { name: /Promoção relâmpago/ }))
    expect(onChange).toHaveBeenCalledWith("promocao-relampago")
  })

  // The list is the API's: a site is handed one model, and only that one is drawn.
  it("draws a site only the blank page it is offered, and says why", () => {
    render(<LandingTemplatePicker value="em-branco" onChange={vi.fn()} templates={SITE_LANDINGS} />)

    expect(screen.getAllByRole("radio")).toHaveLength(1)
    expect(screen.getByRole("radio", { name: /Em branco/ })).toBeChecked()
    expect(screen.getByText(/Um site começa em branco/)).toBeInTheDocument()
  })

  it("marks the one suggested for the shop", () => {
    render(
      <LandingTemplatePicker value="colecao" onChange={vi.fn()} templates={[{ id: "colecao", needsProduct: true, recommended: true }, { id: "em-branco", needsProduct: false }]} />,
    )

    expect(screen.getByRole("radio", { name: /Coleção ou categoria.*Indicado/ })).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: /Em branco/ })).not.toHaveAccessibleName(/Indicado/)
  })

  it("is grey cards while the list is on its way", () => {
    render(<LandingTemplatePicker value={null} onChange={vi.fn()} templates={[]} state="loading" />)

    expect(screen.getByRole("status")).toHaveTextContent("Carregando os modelos")
    expect(screen.queryByRole("radio")).not.toBeInTheDocument()
  })

  it("says the list could not be read, and asks again when told to", async () => {
    const onRetry = vi.fn()
    render(<LandingTemplatePicker value={null} onChange={vi.fn()} templates={[]} state="failed" onRetry={onRetry} />)

    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar os modelos.")
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it("says so when the catalogue offers this page nothing", () => {
    render(<LandingTemplatePicker value={null} onChange={vi.fn()} templates={[]} />)

    expect(screen.getByText("Nenhum modelo disponível para esta página.")).toBeInTheDocument()
  })

  it("knows which ids it can draw", () => {
    expect(isLandingTemplate("colecao")).toBe(true)
    expect(isLandingTemplate("ofertas")).toBe(false)
    expect(isLandingTemplate("toString")).toBe(false)
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<LandingTemplatePicker value="colecao" onChange={vi.fn()} templates={SHOP_LANDINGS} />)

    await expectNoA11yViolations(container)
  })
})
