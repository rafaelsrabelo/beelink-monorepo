// Libs
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StoreIdentityFields } from "./store-identity-fields"
import { sampleStoreCategories, sampleStoreSettingsValues } from "./store.fixtures"

const values = sampleStoreSettingsValues.identity

function renderFields(overrides: Partial<Parameters<typeof StoreIdentityFields>[0]> = {}) {
  const onChange = vi.fn()
  render(
    <StoreIdentityFields
      value={values}
      onChange={onChange}
      slug="doces-da-ana"
      categories={sampleStoreCategories}
      {...overrides}
    />,
  )
  return { onChange }
}

describe("StoreIdentityFields", () => {
  it("hands the whole group back when one field changes", async () => {
    const { onChange } = renderFields()

    await userEvent.type(screen.getByLabelText("Nome da loja"), "!")

    expect(onChange).toHaveBeenCalledWith({ ...values, name: `${values.name}!` })
  })

  it("shows the shop address and refuses to let it be edited", () => {
    renderFields()

    const slug = screen.getByLabelText("Endereço da loja")
    expect(slug).toHaveValue("/doces-da-ana")
    expect(slug).toHaveAttribute("readonly")
  })

  it("renders the verdict the screen's form handed it", () => {
    renderFields({ errors: { name: { message: "O nome da loja precisa ter ao menos 2 caracteres" } } })

    expect(screen.getByRole("alert")).toHaveTextContent(
      "O nome da loja precisa ter ao menos 2 caracteres",
    )
    expect(screen.getByLabelText("Nome da loja")).toHaveAttribute("aria-invalid", "true")
  })

  it("lets the address be chosen when the screen says it can still be set", async () => {
    const onSlugChange = vi.fn()
    renderFields({ onSlugChange })

    const slug = screen.getByLabelText("Endereço da loja")
    expect(slug).not.toHaveAttribute("readonly")
    await userEvent.type(slug, "x")

    expect(onSlugChange).toHaveBeenCalledWith("doces-da-anax")
  })

  it("renders the verdict on an address the schema refused", () => {
    renderFields({
      onSlugChange: vi.fn(),
      slugError: { message: "Use só letras minúsculas, números e hífens, sem acento" },
    })

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Use só letras minúsculas, números e hífens, sem acento",
    )
    expect(screen.getByLabelText("Endereço da loja")).toHaveAttribute("aria-invalid", "true")
  })

  it("takes the description in a textarea, because the bound is 2000 characters", () => {
    renderFields()

    const description = screen.getByLabelText("Descrição")
    expect(description.tagName).toBe("TEXTAREA")
  })

  it("hands the logo to whoever keeps bytes, and reports back the URL it answers", async () => {
    const onLogoUpload = vi.fn(async () => "https://cdn.exemplo.com/logo.png")
    const { onChange } = renderFields({ onLogoUpload })

    const file = new File(["bytes"], "logo.png", { type: "image/png" })
    await userEvent.upload(screen.getByLabelText("Enviar arquivo"), file)

    expect(onLogoUpload).toHaveBeenCalledWith(file)
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({
        ...values,
        logoUrl: "https://cdn.exemplo.com/logo.png",
      }),
    )
  })

  it("names the category the shop already has, not its id", () => {
    renderFields()

    expect(screen.getByRole("combobox", { name: "Categoria" })).toHaveTextContent(
      "Comida e bebida",
    )
  })

  it("takes no edit while the save is in flight", () => {
    renderFields({ disabled: true })

    expect(screen.getByLabelText("Nome da loja")).toBeDisabled()
  })

  it("renders in English when the screen hands it the English dictionary", () => {
    renderFields({ messages: en })

    expect(screen.getByLabelText("Shop name")).toBeInTheDocument()
    expect(screen.queryByLabelText("Nome da loja")).not.toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <StoreIdentityFields
        value={values}
        onChange={vi.fn()}
        slug="doces-da-ana"
        categories={sampleStoreCategories}
        errors={{ name: { message: "O nome da loja precisa ter ao menos 2 caracteres" } }}
      />,
    )

    await expectNoA11yViolations(container)
  })
})
