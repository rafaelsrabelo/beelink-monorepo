// React
import { useState } from "react"
import { renderToString } from "react-dom/server"

// Libs
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { ptBR } from "@harness-monorepo/ui/locales/index"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { LandingCourierForm, type LandingCourierFormProps, type LandingCourierProblem } from "./landing-courier-form"
import type { LandingCourierValues } from "./landing-courier-schema"

const text = ptBR.landing.couriers.form

/** Made up: a CPF whose check digits are right and a number nobody owns. */
const ZULEICA = {
  name: "Zuleica Tavares",
  document: "529.982.247-25",
  whatsapp: "(85) 9 8765-4321",
  vehicle: "MOTORCYCLE",
  acceptedTerms: true,
  website: "",
} satisfies LandingCourierValues

const EVERYTHING = "Para continuar, falta: nome completo, CPF, WhatsApp, aceite dos termos."
const TITLE = "Dê o primeiro passo para entregar com a Beelink"

type User = ReturnType<typeof userEvent.setup>

function renderForm(props: Partial<LandingCourierFormProps> = {}) {
  const user = userEvent.setup()
  const onSubmit = vi.fn<(application: LandingCourierValues) => void>()
  const view = render(<LandingCourierForm termsHref="/termos" privacyHref="/privacidade" text={text} onSubmit={onSubmit} {...props} />)
  return { user, onSubmit, ...view }
}

const field = (label: string) => screen.getByLabelText(label)
const send = () => screen.getByRole("button", { name: /Continuar|Enviando|Tentar de novo/ })
const accept = () => screen.getByRole("checkbox", { name: /Li e aceito/ })

/** Types what a person types: digits alone in the CPF and the WhatsApp, which the masks dress. */
async function fill(user: User, values: Partial<typeof ZULEICA> = {}) {
  const { name, acceptedTerms } = { ...ZULEICA, ...values }
  await user.type(field("Nome completo"), name)
  await user.type(field("CPF"), (values.document ?? ZULEICA.document).replace(/\D/g, ""))
  await user.type(field("WhatsApp"), (values.whatsapp ?? ZULEICA.whatsapp).replace(/\D/g, ""))
  if (acceptedTerms) await user.click(accept())
}

describe("LandingCourierForm, before anything is typed", () => {
  it("is locked: the button is disabled, and described by the sentence that lists what is missing", () => {
    renderForm()

    expect(send()).toBeDisabled()
    expect(send()).toHaveAccessibleName("Continuar")
    expect(send()).toHaveAccessibleDescription(EVERYTHING)
    expect(screen.getByText(EVERYTHING)).toBeVisible()
    expect(screen.getByRole("status")).toBeEmptyDOMElement()
  })

  it("asks for the name, the CPF and the WhatsApp, one to a line, each with its example", () => {
    renderForm()

    expect(field("Nome completo")).toHaveAttribute("placeholder", "Como está no documento")
    expect(field("CPF")).toHaveAttribute("placeholder", "000.000.000-00")
    expect(field("WhatsApp")).toHaveAttribute("placeholder", "(00) 0 0000-0000")
    expect(within(screen.getByRole("form", { name: TITLE })).getAllByRole("textbox").map((input) => input.getAttribute("name"))).toEqual(["name", "document", "whatsapp"])
  })

  // The first step is short (BEELINK-329): the e-mail is a later step's, and the one city open is added by whoever sends.
  it("asks for no e-mail and no city, and says under its button what is left for the next step", () => {
    renderForm()

    expect(screen.queryByLabelText(/e-mail/i)).not.toBeInTheDocument()
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
    expect(document.querySelector('input[type="email"], select')).toBeNull()
    expect(screen.getByText("E-mail e documentos ficam para o próximo passo.")).toBeVisible()
  })

  it("gives the CPF and the WhatsApp a numeric keyboard", () => {
    renderForm()

    expect(field("CPF")).toHaveAttribute("inputmode", "numeric")
    expect(field("WhatsApp")).toHaveAttribute("inputmode", "numeric")
    // The browser offers no CPF of its own, and a remembered one would be somebody else's.
    expect(field("CPF")).toHaveAttribute("autocomplete", "off")
  })

  it("starts on the motorbike, with nothing refused", () => {
    renderForm()

    expect(screen.getByRole("radio", { name: "Moto" })).toBeChecked()
    expect(screen.getAllByRole("radio").map((radio) => radio.parentElement!.textContent)).toEqual(["Moto", "Bike", "Carro", "Utilitário"])
    expect(screen.getByRole("group", { name: "Como vai fazer suas entregas?" })).toBeInTheDocument()
    expect(document.querySelector("[aria-invalid]")).toBeNull()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("says what the name, the CPF and the WhatsApp are used for, in the sentence that is accepted", () => {
    renderForm()

    expect(accept()).not.toBeChecked()
    expect(accept()).toHaveAccessibleName("Li e aceito os termos de uso e a política de privacidade. A Beelink usa meu nome, meu CPF e meu WhatsApp para o cadastro.")
  })

  /** Before the script arrives the browser submits by itself, and a default GET would put the name, the CPF and the phone in the address. */
  it("is, in the HTML the server writes, a form the browser sends nowhere with its button already locked", () => {
    const html = renderToString(<LandingCourierForm termsHref="/termos" privacyHref="/privacidade" text={text} onSubmit={() => {}} />)
    // Parsed and never hydrated: what a browser holds until the script arrives.
    const page = document.createElement("div")
    page.innerHTML = html

    expect(page.querySelector("form")).toHaveAttribute("method", "dialog")
    expect(page.querySelector("form")).not.toHaveAttribute("action")
    const button = page.querySelector('button[type="submit"]')!
    expect(button).toHaveAttribute("disabled")
    expect(page.querySelector(`[id="${button.getAttribute("aria-describedby")}"]`)).toHaveTextContent(EVERYTHING)
    expect(page.querySelector('input[type="radio"][value="MOTORCYCLE"]')).toHaveAttribute("checked")
    expect([...page.querySelectorAll("a")].map((link) => link.getAttribute("href"))).toEqual(["/termos", "/privacidade"])
  })
})

describe("LandingCourierForm, while it is filled in", () => {
  it("dresses the CPF and the WhatsApp as they are typed", async () => {
    const { user } = renderForm()

    await user.type(field("CPF"), "5299822")
    expect(field("CPF")).toHaveValue("529.982.2")
    await user.type(field("CPF"), "4725")
    expect(field("CPF")).toHaveValue("529.982.247-25")

    await user.type(field("WhatsApp"), "859")
    expect(field("WhatsApp")).toHaveValue("(85) 9")
    await user.type(field("WhatsApp"), "87654321")
    expect(field("WhatsApp")).toHaveValue("(85) 9 8765-4321")
  })

  it("dresses them when they are pasted whole, the country's 55 taken off", async () => {
    const { user } = renderForm()

    await user.click(field("CPF"))
    await user.paste("52998224725")
    expect(field("CPF")).toHaveValue("529.982.247-25")

    await user.click(field("WhatsApp"))
    await user.paste("+55 85 98765-4321")
    expect(field("WhatsApp")).toHaveValue("(85) 9 8765-4321")
  })

  it("takes no twelfth digit of a CPF or of a WhatsApp, and nothing that is not a digit", async () => {
    const { user } = renderForm()

    await user.type(field("CPF"), "529a982b247c25999")
    await user.type(field("WhatsApp"), "85-98765-4321-77")

    expect(field("CPF")).toHaveValue("529.982.247-25")
    expect(field("WhatsApp")).toHaveValue("(85) 9 8765-4321")
  })

  it.each([
    ["Nome completo", "Zuleica", "Informe o nome completo, com sobrenome."],
    ["CPF", "52998224726", "Esse CPF não confere. Confira os números."],
    ["WhatsApp", "8532221111", "Informe um celular com DDD."],
  ])("says what is wrong with %s on the field itself, once the person leaves it and not before", async (label, typed, refusal) => {
    const { user } = renderForm()

    await user.type(field(label), typed)
    expect(screen.queryByText(refusal)).not.toBeInTheDocument()
    expect(field(label)).not.toHaveAttribute("aria-invalid")

    await user.tab()

    expect(await screen.findByText(refusal)).toBeVisible()
    expect(field(label)).toHaveAttribute("aria-invalid", "true")
    expect(field(label)).toHaveAccessibleDescription(refusal)
    expect(send()).toBeDisabled()
  })

  /** That the press which leaves the field then lands on what is below takes a layout: it is proved in a browser, in the web's e2e. */
  it("writes a typed field's refusal on a line that stood under the field from the start, so none is added", async () => {
    const { user } = renderForm()
    const line = document.getElementById(`${field("WhatsApp").id}-refusal`)

    expect(line).toBeEmptyDOMElement()
    await user.type(field("WhatsApp"), "8532221111")
    await user.tab()

    expect(await screen.findByText("Informe um celular com DDD.")).toBe(line)
  })

  it("says the acceptance is missing on the checkbox, once it was left unticked", async () => {
    const { user } = renderForm()

    accept().focus()
    await user.tab()

    expect(await screen.findByText("Marque o aceite para continuar.")).toBeVisible()
    expect(accept()).toHaveAccessibleDescription("Marque o aceite para continuar.")
  })

  it("takes a refusal back once the field is put right", async () => {
    const { user } = renderForm()
    await user.type(field("CPF"), "52998224726")
    await user.tab()
    await screen.findByText("Esse CPF não confere. Confira os números.")

    await user.type(field("CPF"), "{Backspace}5")

    await waitFor(() => expect(screen.queryByText("Esse CPF não confere. Confira os números.")).not.toBeInTheDocument())
    expect(field("CPF")).not.toHaveAttribute("aria-invalid")
  })

  it("shortens the sentence under the button as each thing is given, and unlocks only when nothing is left", async () => {
    const { user } = renderForm()

    await user.type(field("Nome completo"), ZULEICA.name)
    expect(send()).toHaveAccessibleDescription("Para continuar, falta: CPF, WhatsApp, aceite dos termos.")
    await user.type(field("CPF"), "52998224725")
    expect(send()).toHaveAccessibleDescription("Para continuar, falta: WhatsApp, aceite dos termos.")
    await user.type(field("WhatsApp"), "85987654321")
    expect(send()).toHaveAccessibleDescription("Para continuar, falta: aceite dos termos.")
    expect(send()).toBeDisabled()
    expect(screen.getByRole("status")).toBeEmptyDOMElement()

    await user.click(accept())

    expect(send()).toBeEnabled()
    expect(send()).not.toHaveAccessibleDescription()
    expect(screen.queryByText(/Para continuar, falta/)).not.toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("Tudo certo: o botão Continuar está liberado.")
  })

  it.each([
    ["the acceptance is taken back", async (user: User) => user.click(accept()), "Para continuar, falta: aceite dos termos."],
    ["a digit of the CPF is erased", async (user: User) => user.type(field("CPF"), "{Backspace}"), "Para continuar, falta: CPF."],
    ["the surname is erased", async (user: User) => user.type(field("Nome completo"), "{Backspace>8/}"), "Para continuar, falta: nome completo."],
    ["the WhatsApp is emptied", async (user: User) => user.clear(field("WhatsApp")), "Para continuar, falta: WhatsApp."],
  ])("locks again when %s", async (_, undo, missing) => {
    const { user } = renderForm({ initial: ZULEICA })
    expect(send()).toBeEnabled()

    await undo(user)

    expect(send()).toBeDisabled()
    expect(send()).toHaveAccessibleDescription(missing)
    expect(screen.getByRole("status")).toBeEmptyDOMElement()
  })

  it("is unlocked by any of the four ways of delivering: one is always chosen", async () => {
    const { user } = renderForm({ initial: ZULEICA })

    for (const vehicle of ["Bike", "Carro", "Utilitário", "Moto"]) {
      await user.click(screen.getByRole("radio", { name: vehicle }))
      expect(send()).toBeEnabled()
    }
  })
})

describe("LandingCourierForm, sent", () => {
  it("hands over what was typed as the masks wrote it, the vehicle, the acceptance and the empty trap — and neither an e-mail nor a city", async () => {
    const { user, onSubmit } = renderForm()
    await fill(user)
    await user.click(screen.getByRole("radio", { name: "Bike" }))

    await user.click(send())

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0]![0]).toEqual({ ...ZULEICA, vehicle: "BICYCLE" })
  })

  it("is filled in and sent with the keyboard alone, in the order the page reads", async () => {
    const { user, onSubmit } = renderForm()

    await user.tab()
    expect(field("Nome completo")).toHaveFocus()
    await user.keyboard(ZULEICA.name)
    await user.tab()
    expect(field("CPF")).toHaveFocus()
    await user.keyboard("52998224725")
    await user.tab()
    expect(field("WhatsApp")).toHaveFocus()
    await user.keyboard("85987654321")
    await user.tab()
    expect(screen.getByRole("radio", { name: "Moto" })).toHaveFocus()
    await user.keyboard("{ArrowRight}")
    expect(screen.getByRole("radio", { name: "Bike" })).toBeChecked()
    await user.tab()
    expect(accept()).toHaveFocus()
    await user.keyboard(" ")
    await user.tab()
    expect(screen.getByRole("link", { name: "termos de uso" })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole("link", { name: "política de privacidade" })).toHaveFocus()
    await user.tab()
    expect(send()).toHaveFocus()
    await user.keyboard("{Enter}")

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0]![0]).toEqual({ ...ZULEICA, vehicle: "BICYCLE" })
  })

  it("is not sent by Enter in a field while something is missing", async () => {
    const { user, onSubmit } = renderForm()

    await user.type(field("Nome completo"), `${ZULEICA.name}{Enter}`)

    expect(onSubmit).not.toHaveBeenCalled()
  })

  /** The trap is out of the keyboard's way and out of the accessibility tree; what fills it in is a robot. */
  it("draws the trap where no person finds it, and hands over whatever was put in it", async () => {
    const { user, onSubmit, container } = renderForm({ initial: ZULEICA })
    const trap = container.querySelector<HTMLInputElement>('input[name="website"]')!

    expect(trap.closest("[aria-hidden='true']")).not.toBeNull()
    expect(trap).toHaveAttribute("tabindex", "-1")
    expect(trap).toHaveAttribute("autocomplete", "off")
    expect(screen.queryByRole("textbox", { name: "Deixe este campo em branco" })).not.toBeInTheDocument()
    expect(screen.getByRole("textbox", { name: "Deixe este campo em branco", hidden: true })).toBe(trap)

    fireEvent.change(trap, { target: { value: "https://spam.example" } })
    await user.click(send())

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0]![0]).toEqual({ ...ZULEICA, website: "https://spam.example" })
  })

  it("keeps its button disabled, with its own words and no spinner, while the send is on its way", () => {
    const { container } = renderForm({ initial: ZULEICA, status: "sending" })

    expect(send()).toBeDisabled()
    expect(send()).toHaveAccessibleName("Enviando…")
    expect(container.querySelector(".animate-spin, [role='progressbar']")).toBeNull()
    expect(field("Nome completo")).toHaveValue(ZULEICA.name)
    expect(screen.getByRole("status")).toBeEmptyDOMElement()
  })
})

describe("LandingCourierForm, when the send met a problem", () => {
  const refused: LandingCourierProblem = { field: "document", message: "O CPF não foi aceito. Confira os números." }
  const limited: LandingCourierProblem = { field: null, message: "Muitos envios em pouco tempo. Espere alguns minutos e tente de novo." }
  const failed: LandingCourierProblem = { field: null, message: "Não foi possível enviar agora. Seus dados continuam aqui.", retry: true }

  const untouched = () => {
    expect(field("Nome completo")).toHaveValue(ZULEICA.name)
    expect(field("CPF")).toHaveValue(ZULEICA.document)
    expect(field("WhatsApp")).toHaveValue(ZULEICA.whatsapp)
    expect(accept()).toBeChecked()
  }

  it("says the API's refusal on the field it is about, takes the person there and leaves the form as it was", async () => {
    renderForm({ initial: ZULEICA, problem: refused })

    expect(field("CPF")).toHaveAttribute("aria-invalid", "true")
    expect(field("CPF")).toHaveAccessibleDescription("O CPF não foi aceito. Confira os números.")
    await waitFor(() => expect(field("CPF")).toHaveFocus())
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(send()).toBeEnabled()
    expect(send()).toHaveAccessibleName("Continuar")
    untouched()
  })

  it.each([
    ["vehicle", () => screen.getByRole("group", { name: "Como vai fazer suas entregas?" })],
    ["acceptedTerms", () => accept()],
  ] as const)("can say a refusal of the %s too", (name, control) => {
    renderForm({ initial: ZULEICA, problem: { field: name, message: "Recusado pela API." } })

    expect(control()).toHaveAccessibleDescription(expect.stringContaining("Recusado pela API."))
  })

  it("says the limit in an alert of its own, with no offer to send again at once", () => {
    renderForm({ initial: ZULEICA, problem: limited })

    expect(screen.getByRole("alert")).toHaveTextContent("Muitos envios em pouco tempo. Espere alguns minutos e tente de novo.")
    expect(send()).toHaveAccessibleName("Continuar")
    expect(document.querySelector("[aria-invalid]")).toBeNull()
    untouched()
  })

  it("says a failure and offers the same form again", async () => {
    const { user, onSubmit } = renderForm({ initial: ZULEICA, problem: failed })

    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível enviar agora. Seus dados continuam aqui.")
    untouched()

    await user.click(screen.getByRole("button", { name: "Tentar de novo" }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0]![0]).toEqual(ZULEICA)
  })

  it("tells the screen when the form is typed in again: what was said of the last send is not about it", async () => {
    const onEdit = vi.fn()
    const { user } = renderForm({ initial: ZULEICA, problem: refused, onEdit })

    await user.type(field("CPF"), "{Backspace}")

    expect(onEdit).toHaveBeenCalled()
  })
})

describe("LandingCourierForm, once the application was taken", () => {
  /** The screen's part, stood in for: it holds where the send is. */
  function Taken({ onAgain, outcome = "sent" }: { onAgain?: () => void; outcome?: "sent" | "already" }) {
    const [status, setStatus] = useState<"idle" | "sent" | "already">("idle")

    return (
      <LandingCourierForm
        termsHref="/termos"
        privacyHref="/privacidade"
        text={text}
        status={status}
        initial={ZULEICA}
        onSubmit={() => setStatus(outcome)}
        onAgain={() => {
          onAgain?.()
          setStatus("idle")
        }}
      />
    )
  }

  const NEXT = "O próximo passo é o seu e-mail e os seus documentos. A Beelink fala com você pelo WhatsApp informado quando ele abrir."
  const ALREADY = "Não precisa enviar de novo. A Beelink fala com você pelo WhatsApp informado nesse cadastro quando o próximo passo abrir."

  // No e-mail was asked for (BEELINK-329): the confirmation names the WhatsApp the person gave, and promises no e-mail.
  it("gives its place to the confirmation, which says who speaks next and where, takes the focus and is said aloud", async () => {
    const user = userEvent.setup()
    render(<Taken />)

    await user.click(send())

    const confirmation = await screen.findByRole("group", { name: "Cadastro recebido." })
    expect(within(confirmation).getByText(NEXT)).toBeVisible()
    expect(confirmation).not.toHaveTextContent(/chega.* por e-mail|no seu e-mail/i)
    await waitFor(() => expect(confirmation).toHaveFocus())
    expect(screen.getByRole("status")).toHaveTextContent(`Cadastro recebido. ${NEXT}`)
    expect(screen.queryByRole("form")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("CPF")).not.toBeInTheDocument()
  })

  describe("when its CPF was on the list already", () => {
    it("gives its place to the same card saying so, with nothing refused on a field, the focus on it and the sentence said aloud", async () => {
      const user = userEvent.setup()
      render(<Taken outcome="already" />)

      await user.click(send())

      const confirmation = await screen.findByRole("group", { name: "Esse CPF já tem cadastro." })
      expect(within(confirmation).getByText(ALREADY)).toBeVisible()
      await waitFor(() => expect(confirmation).toHaveFocus())
      expect(screen.getByRole("status")).toHaveTextContent(`Esse CPF já tem cadastro. ${ALREADY}`)
      expect(screen.queryByRole("form")).not.toBeInTheDocument()
      expect(screen.queryByRole("alert")).not.toBeInTheDocument()
      expect(screen.queryByText("Cadastro recebido.")).not.toBeInTheDocument()
    })

    it("offers another CPF: the form comes back empty, with the focus on its first field", async () => {
      const user = userEvent.setup()
      const again = vi.fn()
      render(<Taken outcome="already" onAgain={again} />)
      await user.click(send())

      await user.click(await screen.findByRole("button", { name: "Cadastrar outro CPF" }))

      expect(again).toHaveBeenCalledTimes(1)
      expect(await screen.findByRole("form", { name: TITLE })).toBeInTheDocument()
      expect(field("CPF")).toHaveValue("")
      await waitFor(() => expect(field("Nome completo")).toHaveFocus())
    })
  })

  it("offers another application: the form comes back empty, locked, and with the focus on its first field", async () => {
    const user = userEvent.setup()
    const again = vi.fn()
    render(<Taken onAgain={again} />)
    await user.click(send())

    await user.click(await screen.findByRole("button", { name: "Enviar outro cadastro" }))

    expect(again).toHaveBeenCalledTimes(1)
    expect(await screen.findByRole("form", { name: TITLE })).toBeInTheDocument()
    expect(field("Nome completo")).toHaveValue("")
    expect(field("CPF")).toHaveValue("")
    expect(field("WhatsApp")).toHaveValue("")
    expect(accept()).not.toBeChecked()
    expect(send()).toBeDisabled()
    await waitFor(() => expect(field("Nome completo")).toHaveFocus())
    expect(screen.getByRole("status")).toBeEmptyDOMElement()
  })
})

describe("LandingCourierForm, the two legal texts", () => {
  const links = () => ({ terms: screen.getByRole("link", { name: "termos de uso" }), privacy: screen.getByRole("link", { name: "política de privacidade" }) })

  /** Whether a click on a link was left for the browser to follow. It is stopped here, after everyone else heard it: jsdom follows no link. */
  function leftToTheBrowser(link: HTMLElement, init?: MouseEventInit): boolean {
    let followed = false
    document.addEventListener(
      "click",
      (event) => {
        followed = !event.defaultPrevented
        event.preventDefault()
      },
      { once: true },
    )
    fireEvent.click(link, init)
    return followed
  }

  it("links to their pages, as plain anchors: with no script, and with none listening, that is where they lead", () => {
    renderForm()

    expect(links().terms).toHaveAttribute("href", "/termos")
    expect(links().privacy).toHaveAttribute("href", "/privacidade")
    expect(leftToTheBrowser(links().terms)).toBe(true)
  })

  it("hands a plain click to the screen, with the link itself, instead of leaving the page — and ticks nothing", async () => {
    const onRead = vi.fn()
    const { user } = renderForm({ onRead })

    await user.click(links().privacy)
    await user.click(links().terms)

    expect(leftToTheBrowser(links().terms)).toBe(false)
    expect(onRead.mock.calls.slice(0, 2)).toEqual([
      ["privacy", links().privacy],
      ["terms", links().terms],
    ])
    expect(accept()).not.toBeChecked()
  })

  it("hands over a link opened by Enter too", async () => {
    const onRead = vi.fn()
    const { user } = renderForm({ onRead })

    links().terms.focus()
    await user.keyboard("{Enter}")

    expect(onRead).toHaveBeenCalledWith("terms", links().terms)
  })

  it.each([
    ["Ctrl", { ctrlKey: true }],
    ["Cmd", { metaKey: true }],
    ["Shift", { shiftKey: true }],
    ["the middle button", { button: 1 }],
  ])("leaves a click with %s to the browser: a new tab is the person's to open", (_, init) => {
    const onRead = vi.fn()
    renderForm({ onRead })

    expect(leftToTheBrowser(links().terms, init)).toBe(true)
    expect(onRead).not.toHaveBeenCalled()
  })

  it("keeps what was typed when a text is asked for", async () => {
    const { user } = renderForm({ onRead: vi.fn() })
    await user.type(field("Nome completo"), ZULEICA.name)
    await user.type(field("CPF"), "52998224725")

    await user.click(links().terms)

    expect(field("Nome completo")).toHaveValue(ZULEICA.name)
    expect(field("CPF")).toHaveValue(ZULEICA.document)
  })
})

describe("LandingCourierForm, to a reader", () => {
  it("has no accessibility violations: empty, refused on its fields, filled in, sending, with a problem and taken", async () => {
    const user = userEvent.setup()
    const empty = render(<LandingCourierForm termsHref="/termos" privacyHref="/privacidade" text={text} onSubmit={() => {}} />)
    await expectNoA11yViolations(empty.container)

    await user.type(field("Nome completo"), "Zuleica")
    await user.type(field("CPF"), "111")
    await user.type(field("WhatsApp"), "85")
    accept().focus()
    await user.tab()
    await screen.findByText("Marque o aceite para continuar.")
    await expectNoA11yViolations(empty.container)
    empty.unmount()

    const states: Partial<LandingCourierFormProps>[] = [
      { initial: ZULEICA },
      { initial: ZULEICA, status: "sending" },
      { initial: ZULEICA, problem: { field: "document", message: "O CPF não foi aceito." } },
      { initial: ZULEICA, problem: { field: null, message: "Não foi possível enviar agora.", retry: true } },
      { initial: ZULEICA, status: "sent" },
      { initial: ZULEICA, status: "already" },
    ]
    for (const state of states) {
      const view = render(<LandingCourierForm termsHref="/termos" privacyHref="/privacidade" text={text} onSubmit={() => {}} {...state} />)
      await expectNoA11yViolations(view.container)
      view.unmount()
    }
  })
})
