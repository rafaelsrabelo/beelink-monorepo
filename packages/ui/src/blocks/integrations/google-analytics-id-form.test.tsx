// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "@harness-monorepo/ui/locales/index"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { GoogleAnalyticsIdForm } from "./google-analytics-id-form"

/** An ID of the right shape, and nobody's property. */
const ID = "G-AB12CD34EF"
const NOT_AN_ID = "Esse não parece um ID de medição. Ele começa com G-, seguido de letras maiúsculas e números, como G-AB12CD34EF. Os códigos que começam com UA-, GTM- ou AW- são de outros produtos do Google e não servem aqui."

const field = () => screen.getByLabelText<HTMLInputElement>("ID de medição")
const connect = () => screen.getByRole("button", { name: "Conectar" })

describe("GoogleAnalyticsIdForm", () => {
  it("is a plain field for an ID that is no secret, and says under it what an ID is and what Google calls it", async () => {
    const { container } = render(<GoogleAnalyticsIdForm onSubmit={() => {}} />)

    expect(field()).toHaveAttribute("type", "text")
    expect(field()).toHaveAttribute("autocomplete", "off")
    expect(field()).toHaveAttribute("placeholder", "Ex.: G-AB12CD34EF")
    expect(field()).toHaveAccessibleDescription(/Começa com G-, seguido de letras maiúsculas e números\. No Google Analytics ele aparece como “ID de métricas”\. Não cole o código da tag/)
    await expectNoA11yViolations(container)
  })

  it("hands the ID over as the API takes it, by the button or by Enter — and sends nothing while the field is blank", async () => {
    const onSubmit = vi.fn()
    render(<GoogleAnalyticsIdForm onSubmit={onSubmit} />)

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

  /** Copying from Google Analytics may bring a line break or a space along: it is still that ID. */
  it("forgives the white space an ID was pasted with, at the ends and in the middle", async () => {
    const onSubmit = vi.fn()
    render(<GoogleAnalyticsIdForm onSubmit={onSubmit} />)

    await userEvent.click(field())
    await userEvent.paste(`\t ${ID.slice(0, 5)} ${ID.slice(5)}\n`)
    await userEvent.click(connect())

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(ID)
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it.each([
    ["a Universal Analytics code", "UA-12345678-1"],
    ["a Tag Manager container", "GTM-AB12CD3"],
    ["a Google Ads code", "AW-1234567890"],
    ["small letters", "g-ab12cd34ef"],
    ["an ID too short", "G-AB12C"],
    ["an ID too long", "G-AB12CD34EF56GH78I"],
    ["the digits alone", "AB12CD34EF"],
    ["the tag's code", `gtag('config', '${ID}');`],
  ])("sends nothing of %s, and says under the field what an ID is", async (_what, typed) => {
    const onSubmit = vi.fn()
    const { container } = render(<GoogleAnalyticsIdForm onSubmit={onSubmit} />)

    await userEvent.click(field())
    await userEvent.paste(typed)
    await userEvent.click(connect())

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole("alert")).toHaveTextContent(NOT_AN_ID)
    expect(field()).toHaveAttribute("aria-invalid", "true")
    expect(field()).toHaveAccessibleDescription(new RegExp("^Esse não parece um ID de medição"))
    // The fix is typed where the refusal is: the focus is back on the field, with what was typed.
    expect(field()).toHaveFocus()
    expect(field().value).toBe(typed)
    await expectNoA11yViolations(container)
  })

  it("stops saying an ID is wrong as soon as the field changes", async () => {
    render(<GoogleAnalyticsIdForm onSubmit={() => {}} />)
    await userEvent.type(field(), "UA-1{Enter}")
    expect(screen.getByRole("alert")).toBeInTheDocument()

    await userEvent.type(field(), "4")
    expect(screen.queryByRole("alert")).toBeNull()
    expect(field()).not.toHaveAttribute("aria-invalid")
  })

  it("locks the field and says it is busy while the ID is saved", () => {
    const { container } = render(<GoogleAnalyticsIdForm onSubmit={() => {}} pending />)

    expect(field()).toBeDisabled()
    expect(screen.getByRole("button", { name: "Conectando…" })).toBeDisabled()
    expect(container.querySelector("form")).toHaveAttribute("aria-busy", "true")
  })

  it("says the API's refusal under the field, in the words it is handed, and hands the focus back", async () => {
    const refusal = "Não foi possível salvar o ID agora. Tente de novo."
    const { rerender } = render(<GoogleAnalyticsIdForm onSubmit={() => {}} />)
    await userEvent.type(field(), ID)
    await userEvent.click(connect())

    rerender(<GoogleAnalyticsIdForm onSubmit={() => {}} pending />)
    rerender(<GoogleAnalyticsIdForm onSubmit={() => {}} error={refusal} />)

    expect(screen.getByRole("alert")).toHaveTextContent(refusal)
    expect(field()).toHaveAttribute("aria-invalid", "true")
    expect(field()).toHaveFocus()
    expect(field().value).toBe(ID)
  })

  it("names the field and the button as it is told, and offers a way out, where the ID replaces another", async () => {
    const onCancel = vi.fn()
    render(<GoogleAnalyticsIdForm onSubmit={() => {}} label="Novo ID de medição" submitLabel="Salvar o novo ID" onCancel={onCancel} />)

    expect(screen.getByLabelText("Novo ID de medição")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Salvar o novo ID" })).toBeDisabled()
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it("offers no way out where the form is all there is, and speaks the language it is handed", () => {
    render(<GoogleAnalyticsIdForm onSubmit={() => {}} messages={en} />)

    expect(screen.getByLabelText("Measurement ID")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Connect" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull()
  })
})
