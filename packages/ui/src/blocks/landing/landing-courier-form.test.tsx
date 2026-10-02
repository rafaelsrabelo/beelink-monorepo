// Libs
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

// Locales
import { ptBR } from "@harness-monorepo/ui/locales/index"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { LandingCourierForm } from "./landing-courier-form"
import { createCourierSchema } from "./landing-courier-schema"

const NOT_OPEN = "O cadastro de entregadores abre em breve. Nada foi enviado: seus dados não saíram deste aparelho."

function renderForm() {
  const user = userEvent.setup()
  render(<LandingCourierForm termsHref="/termos" privacyHref="/privacidade" text={ptBR.landing.couriers.form} />)
  return user
}

async function fill(user: ReturnType<typeof userEvent.setup>, values: { name?: string; whatsapp?: string; city?: string; consent?: boolean } = {}) {
  const { name = "Rafael Rabelo", whatsapp = "(85) 9 8888-7777", city = "Fortaleza/CE", consent = true } = values
  if (name) await user.type(screen.getByLabelText("Nome completo"), name)
  if (whatsapp) await user.type(screen.getByLabelText("WhatsApp"), whatsapp)
  if (city) await user.type(screen.getByLabelText("Cidade onde quer entregar"), city)
  if (consent) await user.click(screen.getByRole("checkbox"))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("the courier's schema", () => {
  const schema = createCourierSchema(ptBR.landing.couriers.form)
  const valid = { name: "Rafael Rabelo", whatsapp: "85988887777", city: "Fortaleza", vehicle: "MOTORCYCLE", consent: true }

  it("takes a full name, a number with its area code, a city, a vehicle and the acceptance", () => {
    expect(schema.safeParse(valid).success).toBe(true)
  })

  it.each([
    ["a first name alone", { name: "Rafael" }],
    ["a number with no area code", { whatsapp: "98888-7777" }],
    ["a number with digits to spare", { whatsapp: "85 9 8888 7777 12" }],
    ["an area code no place has", { whatsapp: "(00) 98888-7777" }],
    ["no city", { city: " " }],
    ["a vehicle the form does not offer", { vehicle: "SKATE" }],
    ["no acceptance", { consent: false }],
  ])("refuses %s", (_, change) => {
    expect(schema.safeParse({ ...valid, ...change }).success).toBe(false)
  })

  it.each(["(85) 9 8888-7777", "85 3333-4444", "+55 85 98888-7777", "085 98888-7777", "55 3333-4444"])("reads %s as a number with its area code", (whatsapp) => {
    expect(schema.safeParse({ ...valid, whatsapp }).success).toBe(true)
  })
})

describe("LandingCourierForm", () => {
  it("starts on the motorbike, with nothing refused", () => {
    renderForm()

    expect(screen.getByRole("radio", { name: "Moto" })).toBeChecked()
    expect(screen.getAllByRole("radio").map((radio) => radio.parentElement!.textContent)).toEqual(["Moto", "Bicicleta", "Carro", "Utilitário"])
    expect(screen.queryByText("Informe a cidade.")).not.toBeInTheDocument()
  })

  it("says what each empty field needs, on the field, and takes the focus to the first", async () => {
    const user = renderForm()

    await user.click(screen.getByRole("button", { name: "Continuar cadastro" }))

    const name = await screen.findByLabelText("Nome completo")
    expect(name).toHaveAttribute("aria-invalid", "true")
    expect(name).toHaveAccessibleDescription("Informe o nome completo, com sobrenome.")
    expect(screen.getByLabelText("WhatsApp")).toHaveAccessibleDescription("Informe um celular com DDD.")
    expect(screen.getByLabelText("Cidade onde quer entregar")).toHaveAccessibleDescription("Informe a cidade.")
    expect(screen.getByRole("checkbox")).toHaveAccessibleDescription("Marque o aceite para continuar.")
    expect(name).toHaveFocus()
    expect(screen.queryByText(NOT_OPEN)).not.toBeInTheDocument()
  })

  /** Decided on 01/10/2026: the form checks what was typed and goes nowhere. */
  it("sends nothing once it is valid: it says the sign-up is not open yet", async () => {
    const fetched = vi.fn()
    vi.stubGlobal("fetch", fetched)
    const user = renderForm()
    await fill(user)
    await user.click(screen.getByRole("radio", { name: "Bicicleta" }))

    await user.click(screen.getByRole("button", { name: "Continuar cadastro" }))

    expect(await screen.findByText(NOT_OPEN)).toHaveAttribute("aria-live", "polite")
    expect(fetched).not.toHaveBeenCalled()
    expect(screen.getByRole("radio", { name: "Bicicleta" })).toBeChecked()
  })

  it("takes the sentence back once the form is typed in again: it was said of the last one", async () => {
    const user = renderForm()
    await fill(user)
    await user.click(screen.getByRole("button", { name: "Continuar cadastro" }))
    await screen.findByText(NOT_OPEN)

    await user.type(screen.getByLabelText("Cidade onde quer entregar"), " ")

    await waitFor(() => expect(screen.queryByText(NOT_OPEN)).not.toBeInTheDocument())
  })

  /** Before the script arrives the browser submits by itself, and a default GET would put the name and the phone in the address. */
  it("is a form the browser itself sends nowhere, with the motorbike chosen in the HTML", () => {
    renderForm()

    expect(screen.getByRole("form", { name: "Comece seu cadastro" })).toHaveAttribute("method", "dialog")
    expect(screen.getByRole("radio", { name: "Moto" })).toHaveAttribute("checked")
  })

  it("leads to the terms and the privacy policy it asks to be accepted", () => {
    renderForm()

    expect(screen.getByRole("link", { name: "termos de uso" })).toHaveAttribute("href", "/termos")
    expect(screen.getByRole("link", { name: "política de privacidade" })).toHaveAttribute("href", "/privacidade")
  })

  it("has no accessibility violations, empty and refused", async () => {
    const user = userEvent.setup()
    const { container } = render(<LandingCourierForm termsHref="/termos" privacyHref="/privacidade" text={ptBR.landing.couriers.form} />)
    await expectNoA11yViolations(container)

    await user.click(screen.getByRole("button", { name: "Continuar cadastro" }))
    await screen.findByText("Informe a cidade.")
    await expectNoA11yViolations(container)
  })
})
