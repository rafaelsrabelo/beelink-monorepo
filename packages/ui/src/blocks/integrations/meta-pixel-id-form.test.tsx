// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "@harness-monorepo/ui/locales/index"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { MetaPixelIdForm } from "./meta-pixel-id-form"

/** An ID of the right shape, and nobody's pixel. */
const ID = "123456789012345"
const NOT_AN_ID = "Esse não parece um ID de pixel. O ID tem só números, de 10 a 20 dígitos: copie de novo no Gerenciador de Eventos e cole aqui."

const field = () => screen.getByLabelText<HTMLInputElement>("ID do pixel")
const connect = () => screen.getByRole("button", { name: "Conectar" })

describe("MetaPixelIdForm", () => {
  it("is a plain field for a number that is no secret, and says under it what an ID is", async () => {
    const { container } = render(<MetaPixelIdForm onSubmit={() => {}} />)

    expect(field()).toHaveAttribute("type", "text")
    expect(field()).toHaveAttribute("inputmode", "numeric")
    expect(field()).toHaveAttribute("autocomplete", "off")
    expect(field()).toHaveAccessibleDescription(/Só os números do ID, de 10 a 20 dígitos\. Não cole o código do pixel/)
    await expectNoA11yViolations(container)
  })

  it("hands the ID over as the API takes it, by the button or by Enter — and sends nothing while the field is blank", async () => {
    const onSubmit = vi.fn()
    render(<MetaPixelIdForm onSubmit={onSubmit} />)

    expect(connect()).toBeDisabled()
    await userEvent.type(field(), "   {Enter}")
    expect(connect()).toBeDisabled()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.queryByRole("alert")).toBeNull()

    await userEvent.clear(field())
    await userEvent.type(field(), ID)
    await userEvent.click(connect())
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(ID)

    await userEvent.type(field(), "{Enter}")
    expect(onSubmit).toHaveBeenCalledTimes(2)
  })

  /** Copying from Events Manager brings a line break along; a number read out in groups is still that number. */
  it("forgives the white space an ID was pasted with, at the ends and in the middle", async () => {
    const onSubmit = vi.fn()
    render(<MetaPixelIdForm onSubmit={onSubmit} />)

    await userEvent.click(field())
    await userEvent.paste(`\t ${ID.slice(0, 5)} ${ID.slice(5)}\n`)
    await userEvent.click(connect())

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(ID)
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it.each([
    ["a number too short", "123456789"],
    ["a number too long", "123456789012345678901"],
    ["a letter in it", "12345678901234a"],
    ["a dash in it", "12345-6789012345"],
    ["the pixel's code", `fbq('init', '${ID}');`],
  ])("sends nothing of %s, and says under the field what an ID is", async (_what, typed) => {
    const onSubmit = vi.fn()
    const { container } = render(<MetaPixelIdForm onSubmit={onSubmit} />)

    await userEvent.click(field())
    await userEvent.paste(typed)
    await userEvent.click(connect())

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole("alert")).toHaveTextContent(NOT_AN_ID)
    expect(field()).toHaveAttribute("aria-invalid", "true")
    expect(field()).toHaveAccessibleDescription(new RegExp("^Esse não parece um ID de pixel"))
    // The fix is typed where the refusal is: the focus is back on the field, with what was typed.
    expect(field()).toHaveFocus()
    expect(field().value).toBe(typed)
    await expectNoA11yViolations(container)
  })

  it("stops saying an ID is wrong as soon as the field changes", async () => {
    render(<MetaPixelIdForm onSubmit={() => {}} />)
    await userEvent.type(field(), "123{Enter}")
    expect(screen.getByRole("alert")).toBeInTheDocument()

    await userEvent.type(field(), "4")
    expect(screen.queryByRole("alert")).toBeNull()
    expect(field()).not.toHaveAttribute("aria-invalid")
  })

  it("locks the field and says it is busy while the ID is saved", () => {
    const { container } = render(<MetaPixelIdForm onSubmit={() => {}} pending />)

    expect(field()).toBeDisabled()
    expect(screen.getByRole("button", { name: "Conectando…" })).toBeDisabled()
    expect(container.querySelector("form")).toHaveAttribute("aria-busy", "true")
  })

  it("says the API's refusal under the field, in the words it is handed, and hands the focus back", async () => {
    const refusal = "Não foi possível salvar o ID agora. Tente de novo."
    const { rerender } = render(<MetaPixelIdForm onSubmit={() => {}} />)
    await userEvent.type(field(), ID)
    await userEvent.click(connect())

    rerender(<MetaPixelIdForm onSubmit={() => {}} pending />)
    rerender(<MetaPixelIdForm onSubmit={() => {}} error={refusal} />)

    expect(screen.getByRole("alert")).toHaveTextContent(refusal)
    expect(field()).toHaveAttribute("aria-invalid", "true")
    expect(field()).toHaveFocus()
    expect(field().value).toBe(ID)
  })

  it("names the field and the button as it is told, and offers a way out, where the ID replaces another", async () => {
    const onCancel = vi.fn()
    render(<MetaPixelIdForm onSubmit={() => {}} label="Novo ID do pixel" submitLabel="Salvar o novo ID" onCancel={onCancel} />)

    expect(screen.getByLabelText("Novo ID do pixel")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Salvar o novo ID" })).toBeDisabled()
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it("offers no way out where the form is all there is, and speaks the language it is handed", () => {
    render(<MetaPixelIdForm onSubmit={() => {}} messages={en} />)

    expect(screen.getByLabelText("Pixel ID")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Connect" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull()
  })
})
