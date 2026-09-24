// Libs
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StoreAppearanceFields } from "./store-appearance-fields"
import { sampleColorPresets, sampleStoreSettingsValues } from "./store.fixtures"

const values = sampleStoreSettingsValues.appearance

function renderFields(overrides: Partial<Parameters<typeof StoreAppearanceFields>[0]> = {}) {
  const onChange = vi.fn()
  render(
    <StoreAppearanceFields
      value={values}
      onChange={onChange}
      presets={sampleColorPresets}
      {...overrides}
    />,
  )
  return { onChange }
}

describe("StoreAppearanceFields", () => {
  it("reports the layout the shopkeeper picked", async () => {
    const { onChange } = renderFields()

    await userEvent.click(screen.getByRole("button", { name: "Com banner" }))

    expect(onChange).toHaveBeenCalledWith({ ...values, layoutType: "BANNER" })
  })

  it("asks for the banner image only when there is a banner to fill", () => {
    const { rerender } = render(<StoreAppearanceFields value={values} onChange={vi.fn()} />)
    expect(screen.queryByText("Imagem do banner")).not.toBeInTheDocument()

    rerender(
      <StoreAppearanceFields value={{ ...values, layoutType: "BANNER" }} onChange={vi.fn()} />,
    )
    expect(screen.getByText("Imagem do banner")).toBeInTheDocument()
    expect(screen.getByLabelText("Clique ou arraste a imagem aqui")).toBeInTheDocument()
  })

  it("offers the banner upload the screen wired up, and only then", async () => {
    const onBannerUpload = vi.fn(async () => "https://cdn.exemplo.com/banner.png")
    const { onChange } = renderFields({
      value: { ...values, layoutType: "BANNER" },
      onBannerUpload,
    })

    const file = new File(["bytes"], "banner.png", { type: "image/png" })
    await userEvent.upload(screen.getByLabelText("Clique ou arraste a imagem aqui"), file)

    expect(onBannerUpload).toHaveBeenCalledWith(file)
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({
        ...values,
        layoutType: "BANNER",
        bannerImageUrl: "https://cdn.exemplo.com/banner.png",
      }),
    )
  })

  it("reports the product card style, the one layoutSettings key the panel offers", async () => {
    const { onChange } = renderFields()

    await userEvent.click(screen.getByRole("button", { name: "Horizontal" }))

    expect(onChange).toHaveBeenCalledWith({ ...values, cardLayout: "horizontal" })
  })

  it("shows which card style is in force, so the toggle is not just decoration", () => {
    renderFields({ value: { ...values, cardLayout: "horizontal" } })

    expect(screen.getByRole("button", { name: "Horizontal" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    expect(screen.getByText("A imagem à esquerda e as informações ao lado.")).toBeVisible()
  })

  // Grouping by category is a showcase per category now, arranged in design mode like any other.
  it("offers no switch to group products by category", () => {
    renderFields()

    expect(screen.queryByRole("checkbox", { name: "Agrupar produtos por categoria" })).not.toBeInTheDocument()
  })

  it("applies a ready-made theme whole, since a palette is four decisions at once", async () => {
    const { onChange } = renderFields()

    await userEvent.click(screen.getByRole("button", { name: /Verde natureza/ }))

    expect(onChange).toHaveBeenCalledWith({ ...values, colors: sampleColorPresets[1].colors })
  })

  it("passes one colour's change up without touching the other three", async () => {
    const { onChange } = renderFields()

    await userEvent.type(screen.getByLabelText("Cor principal"), "0")

    expect(onChange).toHaveBeenCalledWith({
      ...values,
      colors: { ...values.colors, primary: `${values.colors.primary}0` },
    })
  })

  it("renders the verdict on a colour the schema refused", () => {
    renderFields({
      colorErrors: { primary: { message: "Informe uma cor no formato hexadecimal de 6 dígitos" } },
    })

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Informe uma cor no formato hexadecimal de 6 dígitos",
    )
  })

  it("renders in English when the screen hands it the English dictionary", () => {
    renderFields({ messages: en })

    expect(screen.getByLabelText("Primary colour")).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <StoreAppearanceFields
        value={{ ...values, layoutType: "BANNER" }}
        onChange={vi.fn()}
        presets={sampleColorPresets}
        colorErrors={{ primary: { message: "Informe uma cor no formato hexadecimal de 6 dígitos" } }}
      />,
    )

    await expectNoA11yViolations(container)
  })
})
