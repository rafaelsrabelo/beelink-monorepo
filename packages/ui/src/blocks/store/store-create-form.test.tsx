// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StoreCreateForm } from "./store-create-form"
import {
  sampleColorPresets,
  sampleStoreCategories,
  sampleStoreCreateValues,
} from "./store.fixtures"

/** Everything the schema asks for, so a test can refuse exactly one field and know why it failed. */
const filled = {
  ...sampleStoreCreateValues,
  slug: "doces-da-ana",
  identity: { ...sampleStoreCreateValues.identity, name: "Doces da Ana" },
  social: { ...sampleStoreCreateValues.social, whatsapp: "11999998888" },
}

function renderForm(overrides: Partial<Parameters<typeof StoreCreateForm>[0]> = {}) {
  const onSubmit = vi.fn()
  render(
    <StoreCreateForm
      defaultValues={sampleStoreCreateValues}
      onSubmit={onSubmit}
      categories={sampleStoreCategories}
      colorPresets={sampleColorPresets}
      {...overrides}
    />,
  )
  return { onSubmit }
}

describe("StoreCreateForm", () => {
  it("proposes the shop address from the name while nobody has chosen one", async () => {
    renderForm()

    await userEvent.type(screen.getByLabelText("Nome da loja"), "Cantina do Zé")

    expect(screen.getByLabelText("Endereço da loja")).toHaveValue("cantina-do-ze")
  })

  it("stops proposing once the shopkeeper edits the address, so a rename never overwrites it", async () => {
    renderForm()

    const slug = screen.getByLabelText("Endereço da loja")
    await userEvent.type(slug, "cantina")
    await userEvent.type(screen.getByLabelText("Nome da loja"), "Doces da Ana")

    expect(slug).toHaveValue("cantina")
  })

  it("hands every tab over in one create", async () => {
    const { onSubmit } = renderForm({ defaultValues: filled })

    await userEvent.click(screen.getByRole("button", { name: "Criar loja" }))

    expect(onSubmit).toHaveBeenCalledWith(filled, expect.anything())
  })

  it("names the tab that is refusing, rather than failing in silence somewhere else", async () => {
    const { onSubmit } = renderForm({
      defaultValues: { ...filled, social: { ...filled.social, whatsapp: "" } },
    })

    await userEvent.click(screen.getByRole("button", { name: "Criar loja" }))

    expect(onSubmit).not.toHaveBeenCalled()
    const refused = await screen.findByRole("tab", { name: /Redes sociais/ })
    expect(refused).toHaveAttribute("aria-selected", "true")
    expect(refused).toHaveTextContent("com campos a corrigir")
  })

  it("marks a refused tab the reader is not standing on, and not the tab that is fine", async () => {
    const { onSubmit } = renderForm({
      defaultValues: { ...filled, address: { ...filled.address, zipCode: "123" } },
    })

    await userEvent.click(screen.getByRole("button", { name: "Criar loja" }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(await screen.findByRole("tab", { name: /Endereço/ })).toHaveTextContent(
      "com campos a corrigir",
    )
    expect(screen.getByRole("tab", { name: "Redes sociais" })).not.toHaveTextContent(
      "com campos a corrigir",
    )
  })

  it("refuses an address that is not a slug, and says so on the field that holds it", async () => {
    const { onSubmit } = renderForm({ defaultValues: { ...filled, slug: "Doces da Ana" } })

    await userEvent.click(screen.getByRole("button", { name: "Criar loja" }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(
      await screen.findByText("Use só letras minúsculas, números e hífens, sem acento"),
    ).toBeVisible()
  })

  it("applies a ready-made palette from the appearance tab", async () => {
    const { onSubmit } = renderForm({ defaultValues: filled })

    await userEvent.click(screen.getByRole("tab", { name: "Aparência" }))
    await userEvent.click(screen.getByRole("button", { name: /Verde natureza/ }))
    await userEvent.click(screen.getByRole("button", { name: "Criar loja" }))

    expect(onSubmit).toHaveBeenCalledWith(
      { ...filled, colors: sampleColorPresets[1].colors },
      expect.anything(),
    )
  })

  it("announces what the server answered", () => {
    renderForm({ error: "Esse endereço de loja já está em uso. Escolha outro." })

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Esse endereço de loja já está em uso. Escolha outro.",
    )
  })

  it("says it is creating and refuses a second click", () => {
    renderForm({ pending: true })

    expect(screen.getByRole("button", { name: "Criando…" })).toBeDisabled()
  })

  it("offers the logo upload the screen wired up, and nothing when it wired up none", () => {
    const { unmount } = render(
      <StoreCreateForm
        defaultValues={sampleStoreCreateValues}
        onSubmit={vi.fn()}
        categories={sampleStoreCategories}
        onImageUpload={vi.fn(async () => "https://cdn.exemplo.com/logo.png")}
      />,
    )
    expect(screen.getByLabelText("Clique ou arraste a imagem aqui")).toBeEnabled()
    unmount()

    renderForm()
    expect(screen.getByLabelText("Clique ou arraste a imagem aqui")).toBeDisabled()
  })

  it("renders in English when the screen hands it the English dictionary", () => {
    renderForm({ messages: en })

    expect(screen.getByRole("button", { name: "Create shop" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Appearance" })).toBeInTheDocument()
  })

  it("has no accessibility violations, including once a tab is marked as refused", async () => {
    const { container } = render(
      <StoreCreateForm
        defaultValues={{ ...filled, social: { ...filled.social, whatsapp: "" } }}
        onSubmit={vi.fn()}
        categories={sampleStoreCategories}
        colorPresets={sampleColorPresets}
        onImageUpload={vi.fn(async () => "https://cdn.exemplo.com/logo.png")}
        error="Esse endereço de loja já está em uso. Escolha outro."
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: "Criar loja" }))
    await screen.findByText("Informe o WhatsApp que recebe os pedidos")

    await expectNoA11yViolations(container)
  })
})
