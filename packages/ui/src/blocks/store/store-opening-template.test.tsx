// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { isOpeningTemplate, StoreOpeningTemplate, type StoreOpeningTemplateProps } from "./store-opening-template"
import { sampleOpeningTemplates } from "./store.fixtures"

function picker(over: Partial<StoreOpeningTemplateProps> = {}) {
  const props: StoreOpeningTemplateProps = { value: "", onChange: vi.fn(), templates: sampleOpeningTemplates, ...over }
  return { props, ...render(<StoreOpeningTemplate {...props} />) }
}

const choices = () => screen.getByText("Escolher outro modelo (opcional)").closest("details")!

describe("StoreOpeningTemplate", () => {
  it("starts folded away, on the default page", () => {
    picker()

    expect(screen.getByRole("heading", { name: "Página inicial" })).toBeInTheDocument()
    expect(screen.getByText(/Sua loja abre com a página padrão/)).toBeInTheDocument()
    expect(choices()).not.toHaveAttribute("open")
    expect(screen.getByRole("radio", { hidden: true, name: /Página padrão/ })).toBeChecked()
  })

  it("offers the default page first, then every model handed in, in that order", async () => {
    picker()
    await userEvent.click(screen.getByText("Escolher outro modelo (opcional)"))

    expect(screen.getAllByRole("radio").map((radio) => radio.getAttribute("value"))).toEqual(["", "por-categorias", "vitrine-com-capa", "ofertas", "catalogo-enxuto"])
    expect(screen.getByRole("radio", { name: /Por categorias.*Indicado/ })).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: /Vitrine com capa/ })).not.toHaveAccessibleName(/Indicado/)
    expect(screen.getByText(/Uma loja nova ainda não tem produtos/)).toBeInTheDocument()
  })

  it("picks a model, and goes back to the default page", async () => {
    const { props, rerender } = picker()
    await userEvent.click(screen.getByText("Escolher outro modelo (opcional)"))

    await userEvent.click(screen.getByRole("radio", { name: /Ofertas/ }))
    expect(props.onChange).toHaveBeenLastCalledWith("ofertas")

    rerender(<StoreOpeningTemplate {...props} value="ofertas" />)
    expect(screen.getByRole("radio", { name: /Ofertas/ })).toBeChecked()
    await userEvent.click(screen.getByRole("radio", { name: /Página padrão/ }))
    expect(props.onChange).toHaveBeenLastCalledWith("")

    // Back on the default page, the choices stay where the pointer is.
    rerender(<StoreOpeningTemplate {...props} value="" />)
    expect(choices()).toHaveAttribute("open")
  })

  // A choice made is never folded out of sight.
  it("opens unfolded when a model is already picked", () => {
    picker({ value: "vitrine-com-capa" })

    expect(choices()).toHaveAttribute("open")
    expect(screen.getByRole("radio", { name: /Vitrine com capa/ })).toBeChecked()
  })

  it("keeps the default page while the models are on their way, and when they could not be read", async () => {
    const onRetry = vi.fn()
    const { props, rerender } = picker({ value: "ofertas", templates: [], state: "loading" })

    expect(screen.getByRole("status")).toHaveTextContent("Carregando os modelos")
    expect(screen.getAllByRole("radio")).toHaveLength(1)

    rerender(<StoreOpeningTemplate {...props} state="failed" onRetry={onRetry} />)
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar os modelos.")
    expect(screen.getByRole("radio", { name: /Página padrão/ })).toBeEnabled()
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it("waits with the form", () => {
    picker({ value: "ofertas", disabled: true })

    for (const radio of screen.getAllByRole("radio")) expect(radio).toBeDisabled()
  })

  it("knows which ids it can draw", () => {
    expect(isOpeningTemplate("ofertas")).toBe(true)
    expect(isOpeningTemplate("servicos-b2b")).toBe(false)
    expect(isOpeningTemplate("")).toBe(false)
    expect(isOpeningTemplate("constructor")).toBe(false)
  })

  it("speaks the reader's language", () => {
    picker({ messages: en, value: "ofertas" })

    expect(screen.getByRole("heading", { name: "Home page" })).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: /Default page/ })).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = picker({ value: "por-categorias" })

    await expectNoA11yViolations(container)
  })
})
