// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StoreSettingsForm } from "./store-settings-form"
import {
  sampleColorPresets,
  sampleStoreCategories,
  sampleStoreSettingsValues,
} from "./store.fixtures"

function renderForm(overrides: Partial<Parameters<typeof StoreSettingsForm>[0]> = {}) {
  const onSubmit = vi.fn()
  render(
    <StoreSettingsForm
      slug="doces-da-ana"
      defaultValues={sampleStoreSettingsValues}
      onSubmit={onSubmit}
      categories={sampleStoreCategories}
      colorPresets={sampleColorPresets}
      {...overrides}
    />,
  )
  return { onSubmit }
}

describe("StoreSettingsForm", () => {
  it("hands every tab over in one save, because the API replaces the shop whole", async () => {
    const { onSubmit } = renderForm()

    await userEvent.click(screen.getByRole("button", { name: "Salvar alterações" }))

    expect(onSubmit).toHaveBeenCalledWith(sampleStoreSettingsValues, expect.anything())
  })

  it("keeps a shop with no WhatsApp on the screen, and opens the tab that refused it", async () => {
    const { onSubmit } = renderForm({
      defaultValues: {
        ...sampleStoreSettingsValues,
        social: { ...sampleStoreSettingsValues.social, whatsapp: "" },
      },
    })

    await userEvent.click(screen.getByRole("button", { name: "Salvar alterações" }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(await screen.findByText("Informe o WhatsApp que recebe os pedidos")).toBeVisible()
    expect(screen.getByRole("tab", { name: "Redes sociais" })).toHaveAttribute(
      "aria-selected",
      "true",
    )
  })

  it("refuses a shop that would take no payment at all", async () => {
    const { onSubmit } = renderForm({
      defaultValues: { ...sampleStoreSettingsValues, paymentMethods: [] },
    })

    await userEvent.click(screen.getByRole("button", { name: "Salvar alterações" }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(await screen.findByText("Escolha ao menos uma forma de pagamento")).toBeVisible()
  })

  it("saves after how many days a customer turns inactive, and refuses a number outside a week to a year", async () => {
    const { onSubmit } = renderForm()

    await userEvent.click(screen.getByRole("tab", { name: "Clientes" }))
    const days = screen.getByLabelText("Cliente vira inativo depois de")
    await userEvent.clear(days)
    await userEvent.type(days, "5")
    await userEvent.click(screen.getByRole("button", { name: "Salvar alterações" }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(await screen.findByText("Um número de 7 a 365 dias")).toBeVisible()

    await userEvent.clear(days)
    await userEvent.type(days, "90")
    await userEvent.click(screen.getByRole("button", { name: "Salvar alterações" }))
    expect(onSubmit).toHaveBeenCalledWith({ ...sampleStoreSettingsValues, customers: { inactiveAfterDays: 90 } }, expect.anything())
  })

  it("carries an edit made in one tab into the save", async () => {
    const { onSubmit } = renderForm()

    await userEvent.type(screen.getByLabelText("Nome da loja"), "!")
    await userEvent.click(screen.getByRole("button", { name: "Salvar alterações" }))

    expect(onSubmit).toHaveBeenCalledWith(
      {
        ...sampleStoreSettingsValues,
        identity: {
          ...sampleStoreSettingsValues.identity,
          name: `${sampleStoreSettingsValues.identity.name}!`,
        },
      },
      expect.anything(),
    )
  })

  it("announces what the server answered", () => {
    renderForm({ error: "Não foi possível salvar as alterações. Tente novamente." })

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível salvar as alterações. Tente novamente.",
    )
  })

  it("says it is saving and refuses a second click", () => {
    renderForm({ pending: true })

    expect(screen.getByRole("button", { name: "Salvando…" })).toBeDisabled()
  })

  it("renders in English when the screen hands it the English dictionary", () => {
    renderForm({ messages: en })

    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Appearance" })).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <StoreSettingsForm
        slug="doces-da-ana"
        defaultValues={sampleStoreSettingsValues}
        onSubmit={vi.fn()}
        categories={sampleStoreCategories}
        colorPresets={sampleColorPresets}
        error="Não foi possível salvar as alterações. Tente novamente."
      />,
    )

    await expectNoA11yViolations(container)
  })
})
