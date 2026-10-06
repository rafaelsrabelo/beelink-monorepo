// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "@harness-monorepo/ui/locales/index"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { AsaasKeyForm } from "./asaas-key-form"

/** Typed by the tests, and nobody's key: nothing here is ever a snapshot. */
const TYPED = "$aact_hmlg_chave-de-teste"
/** The part of it no placeholder or sentence of the form repeats. */
const TYPED_ALONE = "chave-de-teste"

const field = () => screen.getByLabelText<HTMLInputElement>("Chave de API")

describe("AsaasKeyForm", () => {
  it("is a secret's field: masked, off autocomplete and spell-check, and named by nothing a password manager takes for a login", async () => {
    const { container } = render(<AsaasKeyForm onSubmit={() => {}} />)

    expect(field()).toHaveAttribute("type", "password")
    expect(field()).toHaveAttribute("autocomplete", "off")
    expect(field()).toHaveAttribute("spellcheck", "false")
    expect(field()).not.toHaveAttribute("name")
    for (const ignore of ["data-1p-ignore", "data-lpignore", "data-bwignore", "data-form-type"]) expect(field()).toHaveAttribute(ignore)
    // Where a key is created at Asaas is said under the field, and read with it.
    expect(field()).toHaveAccessibleDescription(/Integrações > Chaves de API/)
    await expectNoA11yViolations(container)
  })

  /** React mirrors a controlled input's value into its attribute: the key would sit in the page's markup. */
  it("keeps what is typed in the field alone, in no attribute and nowhere else on the page", async () => {
    const { container } = render(<AsaasKeyForm onSubmit={() => {}} />)

    await userEvent.type(field(), TYPED)

    expect(field().value).toBe(TYPED)
    expect(field()).not.toHaveAttribute("value")
    expect(container.innerHTML).not.toContain(TYPED_ALONE)
  })

  it("shows the key when asked, hides it again, and hides it as it is sent", async () => {
    render(<AsaasKeyForm onSubmit={() => {}} />)
    await userEvent.type(field(), TYPED)

    await userEvent.click(screen.getByRole("button", { name: "Mostrar a chave" }))
    expect(field()).toHaveAttribute("type", "text")
    expect(field().value).toBe(TYPED)

    await userEvent.click(screen.getByRole("button", { name: "Esconder a chave" }))
    expect(field()).toHaveAttribute("type", "password")

    await userEvent.click(screen.getByRole("button", { name: "Mostrar a chave" }))
    await userEvent.click(screen.getByRole("button", { name: "Conectar" }))
    expect(field()).toHaveAttribute("type", "password")
  })

  it("hands the key over once, trimmed, by the button or by Enter — and sends nothing while the field is blank", async () => {
    const onSubmit = vi.fn()
    render(<AsaasKeyForm onSubmit={onSubmit} />)

    expect(screen.getByRole("button", { name: "Conectar" })).toBeDisabled()
    await userEvent.type(field(), "   ")
    expect(screen.getByRole("button", { name: "Conectar" })).toBeDisabled()
    await userEvent.type(field(), "{Enter}")
    expect(onSubmit).not.toHaveBeenCalled()

    await userEvent.clear(field())
    await userEvent.type(field(), `  ${TYPED} `)
    await userEvent.click(screen.getByRole("button", { name: "Conectar" }))
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(TYPED)

    await userEvent.type(field(), "{Enter}")
    expect(onSubmit).toHaveBeenCalledTimes(2)
  })

  it("locks the field and says it is busy while the key is checked", () => {
    const onSubmit = vi.fn()
    const { container } = render(<AsaasKeyForm onSubmit={onSubmit} pending />)

    expect(field()).toBeDisabled()
    expect(screen.getByRole("button", { name: "Mostrar a chave" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Conectando…" })).toBeDisabled()
    expect(container.querySelector("form")).toHaveAttribute("aria-busy", "true")
  })

  it("says the refusal under the field, as the field's own, and hands the focus back to it", async () => {
    const refusal = "O Asaas não aceitou essa chave. Copie a chave de novo, inteira, e cole aqui."
    const { container, rerender } = render(<AsaasKeyForm onSubmit={() => {}} />)
    await userEvent.type(field(), TYPED)
    // The button takes the focus as it is pressed, and loses it as the form locks.
    await userEvent.click(screen.getByRole("button", { name: "Conectar" }))
    expect(field()).not.toHaveFocus()

    rerender(<AsaasKeyForm onSubmit={() => {}} pending />)
    rerender(<AsaasKeyForm onSubmit={() => {}} error={refusal} />)
    expect(screen.getByRole("alert")).toHaveTextContent(refusal)
    expect(field()).toHaveAttribute("aria-invalid", "true")
    expect(field()).toHaveAccessibleDescription(new RegExp(`^${refusal}`))
    expect(field()).toHaveFocus()
    // Refused, the key is still there to be looked at and mended.
    expect(field().value).toBe(TYPED)
    await expectNoA11yViolations(container)
  })

  it("names the field and the button as it is told, and offers a way out, where the key replaces another", async () => {
    const onCancel = vi.fn()
    render(<AsaasKeyForm onSubmit={() => {}} label="Nova chave de API" submitLabel="Conectar com a nova chave" onCancel={onCancel} />)

    expect(screen.getByLabelText("Nova chave de API")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Conectar com a nova chave" })).toBeDisabled()
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it("offers no way out where the form is all there is, and speaks the language it is handed", () => {
    render(<AsaasKeyForm onSubmit={() => {}} messages={en} />)

    expect(screen.getByLabelText("API key")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Connect" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull()
  })
})
