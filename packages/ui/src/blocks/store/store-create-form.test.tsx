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

const step = (name: string | RegExp) => screen.getByRole("button", { name })
const nextButton = () => screen.getByRole("button", { name: "Continuar" })

/**
 * The number in front of a step is `aria-hidden`, so a step is reached by its label — anchored,
 * because a step that is done or refused says so after it for anyone listening rather than looking.
 */
async function walkToEnd() {
  for (let left = 3; left > 0; left -= 1) await userEvent.click(nextButton())
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

  describe("walking the steps", () => {
    /**
     * Emptiness and not validity. A button disabled until everything is correct leaves someone
     * staring at a control that will not move with no reason why; one that lights up as soon as
     * the required boxes have something in them is a prompt, and pressing it is what surfaces a
     * badly shaped value.
     */
    it("will not go on while a required field is empty", () => {
      renderForm()

      expect(nextButton()).toBeDisabled()
    })

    it("goes on the moment the required fields have something in them", async () => {
      renderForm()

      await userEvent.type(screen.getByLabelText("Nome da loja"), "Doces da Ana")

      expect(nextButton()).toBeEnabled()
    })

    // The address asks for nothing, in this form and in the API's DTO alike. A step that blocked
    // on it would be inventing a rule neither half of the product has.
    it("lets the address be skipped entirely, because the product treats it as optional", async () => {
      renderForm({ defaultValues: filled })

      await userEvent.click(nextButton())

      expect(screen.getByLabelText("CEP")).toBeInTheDocument()
      expect(nextButton()).toBeEnabled()
    })

    it("refuses to leave a step whose field is filled but wrong, and says so there", async () => {
      renderForm({ defaultValues: { ...filled, slug: "Doces da Ana" } })

      await userEvent.click(nextButton())

      expect(
        await screen.findByText("Use só letras minúsculas, números e hífens, sem acento"),
      ).toBeVisible()
      // Still on the first step: the mistake is cheapest to fix where it was made.
      expect(screen.getByLabelText("Nome da loja")).toBeInTheDocument()
    })

    it("goes back without losing what was typed", async () => {
      renderForm({ defaultValues: filled })

      await userEvent.click(nextButton())
      await userEvent.click(screen.getByRole("button", { name: "Voltar" }))

      expect(screen.getByLabelText("Nome da loja")).toHaveValue("Doces da Ana")
    })

    /** A step already passed is a button; one never reached is not. That is what makes these steps. */
    it("opens a step already passed, and not one never reached", async () => {
      renderForm({ defaultValues: filled })

      expect(step(/^Aparência/)).toBeDisabled()

      await userEvent.click(nextButton())

      expect(step(/^Informações básicas/)).toBeEnabled()
      expect(step(/^Aparência/)).toBeDisabled()
    })

    it("offers nothing to create before the last step", async () => {
      renderForm({ defaultValues: filled })

      expect(screen.queryByRole("button", { name: "Criar loja" })).not.toBeInTheDocument()

      await walkToEnd()

      expect(screen.getByRole("button", { name: "Criar loja" })).toBeInTheDocument()
    })

    it("says where in the walk the shopkeeper is", async () => {
      renderForm({ defaultValues: filled })

      expect(screen.getByText("Passo 1 de 4")).toBeInTheDocument()

      await userEvent.click(nextButton())

      expect(screen.getByText("Passo 2 de 4")).toBeInTheDocument()
    })
  })

  it("hands every step over in one create", async () => {
    const { onSubmit } = renderForm({ defaultValues: filled })

    await walkToEnd()
    await userEvent.click(screen.getByRole("button", { name: "Criar loja" }))

    expect(onSubmit).toHaveBeenCalledWith(filled, expect.anything())
  })

  /**
   * The last button reports the whole form, not the step under it. A required field emptied by
   * walking back would otherwise be invisible from here, and the create would refuse in silence.
   */
  it("will not create while a field on an earlier step is empty", async () => {
    renderForm({ defaultValues: filled })

    await walkToEnd()
    await userEvent.click(step(/^Redes sociais/))
    await userEvent.clear(screen.getByLabelText("WhatsApp"))
    await userEvent.click(step(/^Aparência/))

    expect(screen.getByRole("button", { name: "Criar loja" })).toBeDisabled()
  })

  /**
   * Most of what the old tab layout needed marking for cannot happen now: a step is checked on the
   * way out, so a bad postcode never reaches the end to refuse there. It refuses where it is.
   */
  it("refuses to leave the address step with a postcode that is not one, and marks it", async () => {
    renderForm({ defaultValues: { ...filled, address: { ...filled.address, zipCode: "123" } } })

    await userEvent.click(nextButton())
    await userEvent.click(nextButton())

    expect(await screen.findByLabelText("CEP")).toBeInTheDocument()
    expect(step(/^Endereço/)).toHaveTextContent("com campos a corrigir")
    expect(step(/^Informações básicas/)).not.toHaveTextContent("com campos a corrigir")
  })

  /**
   * What is still possible: walking back, breaking something, and walking forward again past the
   * check that would have caught it. The create is the backstop, and it carries the shopkeeper to
   * the step that refused rather than failing where they are standing.
   */
  it("carries the shopkeeper back when something broken earlier reaches the create", async () => {
    const { onSubmit } = renderForm({ defaultValues: filled })

    await walkToEnd()
    await userEvent.click(step(/^Informações básicas/))
    await userEvent.clear(screen.getByLabelText("Endereço da loja"))
    await userEvent.type(screen.getByLabelText("Endereço da loja"), "Doces da Ana")
    await userEvent.click(step(/^Aparência/))
    await userEvent.click(screen.getByRole("button", { name: "Criar loja" }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(
      await screen.findByText("Use só letras minúsculas, números e hífens, sem acento"),
    ).toBeVisible()
    expect(step(/^Informações básicas/)).toHaveTextContent("com campos a corrigir")
  })

  it("applies a ready-made palette on the last step", async () => {
    const { onSubmit } = renderForm({ defaultValues: filled })

    await walkToEnd()
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

  it("says it is creating and refuses a second click", async () => {
    renderForm({ defaultValues: filled })

    await walkToEnd()
    expect(screen.getByRole("button", { name: "Criar loja" })).toBeEnabled()
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
    renderForm({ messages: en, defaultValues: filled })

    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument()
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument()
  })

  it("has no accessibility violations, including once a step is marked as refused", async () => {
    const { container } = render(
      <StoreCreateForm
        defaultValues={{ ...filled, slug: "Doces da Ana" }}
        onSubmit={vi.fn()}
        categories={sampleStoreCategories}
        colorPresets={sampleColorPresets}
        onImageUpload={vi.fn(async () => "https://cdn.exemplo.com/logo.png")}
        error="Esse endereço de loja já está em uso. Escolha outro."
      />,
    )

    await userEvent.click(nextButton())
    await screen.findByText("Use só letras minúsculas, números e hífens, sem acento")

    await expectNoA11yViolations(container)
  })
})
