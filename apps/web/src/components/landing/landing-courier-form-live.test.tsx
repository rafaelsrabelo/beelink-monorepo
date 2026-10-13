// React
import type { ReactNode } from "react"

// Libs
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// Types
import type { CourierApplicationPayload } from "@harness-monorepo/contracts"

// App
import { courierApplicationCopyOf } from "./courier-application-copy"
import { LandingCourierFormLive } from "./landing-courier-form-live"
import { SiteTrackContext } from "@/components/site-analytics/use-site-track"
import { legalTexts } from "@/locales/legal/pt-BR"
import { ptBR as web } from "@/locales/pt-BR"
import type { SiteEvent } from "@/lib/site-analytics"

type Fetched = (url: string, init?: RequestInit) => Promise<Response>
type User = ReturnType<typeof userEvent.setup>

/** Made up: a CPF whose check digits are right and a number nobody owns. */
const ZULEICA = { name: "Zuleica Tavares", document: "52998224725", whatsapp: "85987654321" }

/**
 * What the API is sent for her: the masks' punctuation still on, no e-mail — the first step asks for
 * none — and the one city open, which nobody typed (BEELINK-329).
 */
const SENT = {
  name: "Zuleica Tavares",
  document: "529.982.247-25",
  whatsapp: "(85) 9 8765-4321",
  city: "FORTALEZA_CE",
  vehicle: "MOTORCYCLE",
  acceptedTerms: true,
  website: "",
} satisfies CourierApplicationPayload

const A_SENTENCE_OF_THE_TERMS = "O bee-link não é um marketplace. Não existe uma página que reúna todas as lojas, e uma loja não vê os clientes de outra."

/** This app's own route, stood in for. */
function answers(...responses: (() => Response | Promise<Response>)[]) {
  const fetched = vi.fn<Fetched>(async () => (responses.length > 1 ? responses.shift()! : responses[0]!)())
  vi.stubGlobal("fetch", fetched)
  return fetched
}

const taken = () => new Response(null, { status: 204 })
const refusal = (status: number, errorCode: string) => () => Response.json({ statusCode: status, errorCode, message: "x" }, { status })

function open(told?: (event: SiteEvent) => void) {
  const client = new QueryClient()
  const measured = (page: ReactNode) => (told ? <SiteTrackContext value={told}>{page}</SiteTrackContext> : page)
  const view = render(
    <QueryClientProvider client={client}>{measured(<LandingCourierFormLive termsHref="/termos" privacyHref="/privacidade" text={ui.landing.couriers.form} copy={courierApplicationCopyOf(web)} />)}</QueryClientProvider>,
  )
  return { user: userEvent.setup(), ...view }
}

const field = (label: string) => screen.getByLabelText(label)
const send = () => screen.getByRole("button", { name: /Continuar|Enviando|Tentar de novo/ })
const FORM = "Dê o primeiro passo para entregar com a Beelink"

async function fill(user: User) {
  await user.type(field("Nome completo"), ZULEICA.name)
  await user.type(field("CPF"), ZULEICA.document)
  await user.type(field("WhatsApp"), ZULEICA.whatsapp)
  await user.click(screen.getByRole("checkbox", { name: /Li e aceito/ }))
}

const bodyOf = (fetched: ReturnType<typeof answers>, call = 0) => JSON.parse(String(fetched.mock.calls[call]![1]?.body)) as Record<string, unknown>

afterEach(() => vi.unstubAllGlobals())

describe("LandingCourierFormLive (BEELINK-322)", () => {
  it("sends nothing while the form is being filled in", async () => {
    const fetched = answers(taken)
    const { user } = open()

    await fill(user)

    expect(fetched).not.toHaveBeenCalled()
  })

  it("posts the application to this app's own route with the wire's fields and no other — the open city added, no e-mail — and gives its place to the confirmation", async () => {
    const fetched = answers(taken)
    const { user } = open()
    await fill(user)

    await user.click(send())

    expect(await screen.findByRole("group", { name: "Cadastro recebido." })).toBeInTheDocument()
    expect(screen.getByText("O próximo passo é o seu e-mail e os seus documentos. A Beelink fala com você pelo WhatsApp informado quando ele abrir.")).toBeVisible()
    expect(fetched).toHaveBeenCalledTimes(1)
    expect(fetched.mock.calls[0]![0]).toBe("/api/courier-applications")
    expect(fetched.mock.calls[0]![1]?.method).toBe("POST")
    // The API refuses a body with one field more than these.
    expect(bodyOf(fetched)).toEqual(SENT)
    expect(bodyOf(fetched)).not.toHaveProperty("email")
  })

  it("sends the way of delivering that was chosen", async () => {
    const fetched = answers(taken)
    const { user } = open()
    await fill(user)
    await user.click(screen.getByRole("radio", { name: "Utilitário" }))

    await user.click(send())

    await screen.findByRole("group", { name: "Cadastro recebido." })
    expect(bodyOf(fetched).vehicle).toBe("VAN")
  })

  it("keeps the button from a second press while the send is on its way", async () => {
    let arrive: (response: Response) => void = () => {}
    const fetched = answers(() => new Promise<Response>((resolve) => (arrive = resolve)))
    const { user } = open()
    await fill(user)

    await user.click(send())

    await waitFor(() => expect(send()).toHaveAccessibleName("Enviando…"))
    expect(send()).toBeDisabled()
    arrive(taken())
    await screen.findByRole("group", { name: "Cadastro recebido." })
    expect(fetched).toHaveBeenCalledTimes(1)
  })

  describe("told to whoever measures the page", () => {
    it("tells a lead once the API took the application — the event's name, and nothing the form holds", async () => {
      const told = vi.fn<(event: SiteEvent) => void>()
      answers(taken)
      const { user } = open(told)
      await fill(user)

      await user.click(send())

      await screen.findByRole("group", { name: "Cadastro recebido." })
      expect(told.mock.calls).toEqual([[{ name: "generate_lead" }]])
      expect(JSON.stringify(told.mock.calls)).not.toMatch(/Zuleica|Tavares|529|982|247|exemplo|987|654|FORTALEZA|MOTORCYCLE/)
    })

    it.each([
      ["the API refused", refusal(400, "COURIER_DOCUMENT_INVALID")],
      ["met the limit", refusal(429, "RATE_LIMITED")],
      ["failed", refusal(500, "INTERNAL_SERVER_ERROR")],
    ])("tells nothing of an application that %s", async (_, response) => {
      const told = vi.fn<(event: SiteEvent) => void>()
      answers(response)
      const { user } = open(told)
      await fill(user)

      await user.click(send())

      await waitFor(() => expect(send()).toBeEnabled())
      expect(told).not.toHaveBeenCalled()
    })

    it("tells nothing of a form that was never sent", async () => {
      const told = vi.fn<(event: SiteEvent) => void>()
      answers(taken)
      const { user } = open(told)

      await fill(user)

      expect(told).not.toHaveBeenCalled()
    })

    it("sends all the same on a page nobody measures", async () => {
      const fetched = answers(taken)
      const { user } = open()
      await fill(user)

      await user.click(send())

      expect(await screen.findByRole("group", { name: "Cadastro recebido." })).toBeInTheDocument()
      expect(fetched).toHaveBeenCalledTimes(1)
    })
  })

  describe("when the send meets a problem", () => {
    const kept = () => {
      expect(field("Nome completo")).toHaveValue("Zuleica Tavares")
      expect(field("CPF")).toHaveValue("529.982.247-25")
      expect(field("WhatsApp")).toHaveValue("(85) 9 8765-4321")
      expect(screen.getByRole("checkbox", { name: /Li e aceito/ })).toBeChecked()
    }

    // BEELINK-325: a 409, since nothing is wrong with what was typed — it is on the list already.
    // A WhatsApp there under another CPF is still the form's to fix: the person may have mistyped it.
    it("says COURIER_WHATSAPP_TAKEN on its own field, takes the person there, keeps the form and offers no send again", async () => {
      answers(refusal(409, "COURIER_WHATSAPP_TAKEN"))
      const { user } = open()
      await fill(user)

      await user.click(send())

      await waitFor(() => expect(field("WhatsApp")).toHaveAccessibleDescription(expect.stringContaining("Este WhatsApp já está cadastrado.")))
      expect(field("WhatsApp")).toHaveAttribute("aria-invalid", "true")
      expect(field("WhatsApp")).toHaveFocus()
      expect(screen.queryByRole("button", { name: "Tentar de novo" })).not.toBeInTheDocument()
      expect(screen.queryByText("Cadastro recebido.")).not.toBeInTheDocument()
      kept()
    })

    // The first step has no field for either (BEELINK-329): the sentence is said over the button, and nothing is offered again at once.
    it.each([
      [409, "COURIER_EMAIL_TAKEN", "Este e-mail já está cadastrado."],
      [400, "COURIER_EMAIL_INVALID", "Informe um e-mail válido."],
      [400, "COURIER_CITY_NOT_OPEN", "O cadastro ainda não está aberto para essa cidade."],
    ])("says a %i %s, which no field of this step is about, in an alert of its own, and keeps the form", async (status, code, sentence) => {
      answers(refusal(status, code))
      const { user } = open()
      await fill(user)

      await user.click(send())

      expect(await screen.findByRole("alert")).toHaveTextContent(sentence)
      expect(document.querySelector("[aria-invalid]")).toBeNull()
      expect(screen.queryByRole("button", { name: "Tentar de novo" })).not.toBeInTheDocument()
      kept()
    })

    it.each([
      ["COURIER_NAME_INVALID", "Nome completo", "Informe o nome completo, com sobrenome."],
      ["COURIER_DOCUMENT_INVALID", "CPF", "Esse CPF não confere. Confira os números."],
      ["COURIER_WHATSAPP_INVALID", "WhatsApp", "Informe um celular com DDD."],
    ])("says the API's %s on its own field, takes the person there and keeps the form", async (code, label, sentence) => {
      answers(refusal(400, code))
      const { user } = open()
      await fill(user)

      await user.click(send())

      await waitFor(() => expect(field(label)).toHaveAccessibleDescription(expect.stringContaining(sentence)))
      expect(field(label)).toHaveAttribute("aria-invalid", "true")
      await waitFor(() => expect(field(label)).toHaveFocus())
      expect(screen.queryByRole("alert")).not.toBeInTheDocument()
      expect(screen.queryByRole("group", { name: "Cadastro recebido." })).not.toBeInTheDocument()
      kept()
    })

    it("says the limit in its own sentence, keeps the form and offers nothing to press at once", async () => {
      answers(refusal(429, "RATE_LIMITED"))
      const { user } = open()
      await fill(user)

      await user.click(send())

      expect(await screen.findByRole("alert")).toHaveTextContent("Muitos envios em pouco tempo. Espere alguns minutos e tente de novo.")
      expect(send()).toHaveAccessibleName("Continuar")
      kept()
    })

    it.each([
      ["a 5xx", refusal(503, "SERVICE_UNAVAILABLE")],
      ["no answer at all", () => Promise.reject(new TypeError("Failed to fetch"))],
    ])("says a failure on %s, keeps the form, and sends the same application again when asked", async (_, failure) => {
      const fetched = answers(failure, taken)
      const { user } = open()
      await fill(user)
      await user.click(send())

      expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível enviar o cadastro agora. O que você preencheu continua aqui: tente de novo.")
      kept()

      await user.click(screen.getByRole("button", { name: "Tentar de novo" }))

      expect(await screen.findByRole("group", { name: "Cadastro recebido." })).toBeInTheDocument()
      expect(fetched).toHaveBeenCalledTimes(2)
      expect(bodyOf(fetched, 1)).toEqual(SENT)
    })

    it("takes the sentence back once the form is typed in again: it was said of the last send", async () => {
      answers(refusal(429, "RATE_LIMITED"))
      const { user } = open()
      await fill(user)
      await user.click(send())
      await screen.findByRole("alert")

      await user.type(field("Nome completo"), " Lima")

      await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument())
    })
  })

  it("takes another application after one: the form comes back empty, and the next send is its own", async () => {
    const fetched = answers(taken)
    const { user } = open()
    await fill(user)
    await user.click(send())

    await user.click(await screen.findByRole("button", { name: "Enviar outro cadastro" }))

    expect(await screen.findByRole("form", { name: FORM })).toBeInTheDocument()
    expect(field("CPF")).toHaveValue("")
    expect(send()).toBeDisabled()

    await user.type(field("Nome completo"), "Raimundo Nonato")
    await user.type(field("CPF"), "11144477735")
    await user.type(field("WhatsApp"), "85912345678")
    await user.click(screen.getByRole("checkbox", { name: /Li e aceito/ }))
    await user.click(send())

    await screen.findByRole("group", { name: "Cadastro recebido." })
    expect(fetched).toHaveBeenCalledTimes(2)
    expect(bodyOf(fetched, 1)).toMatchObject({ name: "Raimundo Nonato", document: "111.444.777-35", whatsapp: "(85) 9 1234-5678", city: "FORTALEZA_CE" })
  })

  describe("when the CPF is on the list already (BEELINK-329)", () => {
    const ALREADY = "Não precisa enviar de novo. A Beelink fala com você pelo WhatsApp informado nesse cadastro quando o próximo passo abrir."

    it("puts \"Esse CPF já tem cadastro\" where the confirmation stands, with no field refused and nothing to try again", async () => {
      const fetched = answers(refusal(409, "COURIER_DOCUMENT_TAKEN"))
      const { user } = open()
      await fill(user)

      await user.click(send())

      const card = await screen.findByRole("group", { name: "Esse CPF já tem cadastro." })
      expect(card).toHaveTextContent(ALREADY)
      await waitFor(() => expect(card).toHaveFocus())
      expect(screen.queryByRole("form")).not.toBeInTheDocument()
      expect(screen.queryByRole("alert")).not.toBeInTheDocument()
      expect(screen.queryByText("Cadastro recebido.")).not.toBeInTheDocument()
      expect(screen.queryByRole("button", { name: "Tentar de novo" })).not.toBeInTheDocument()
      // Sent once: the answer is final, and nothing sends it again behind the person's back.
      expect(fetched).toHaveBeenCalledTimes(1)
    })

    it("is no lead: nothing was taken, and nobody is told one was", async () => {
      answers(refusal(409, "COURIER_DOCUMENT_TAKEN"))
      const told = vi.fn()
      const { user } = open(told)
      await fill(user)

      await user.click(send())

      await screen.findByRole("group", { name: "Esse CPF já tem cadastro." })
      expect(told).not.toHaveBeenCalled()
    })

    it("takes another CPF after it: the form comes back empty, and the next send is its own", async () => {
      const fetched = answers(refusal(409, "COURIER_DOCUMENT_TAKEN"), taken)
      const { user } = open()
      await fill(user)
      await user.click(send())

      await user.click(await screen.findByRole("button", { name: "Cadastrar outro CPF" }))

      expect(await screen.findByRole("form", { name: FORM })).toBeInTheDocument()
      expect(field("CPF")).toHaveValue("")
      await user.type(field("Nome completo"), "Raimundo Nonato")
      await user.type(field("CPF"), "11144477735")
      await user.type(field("WhatsApp"), "85912345678")
      await user.click(screen.getByRole("checkbox", { name: /Li e aceito/ }))
      await user.click(send())

      expect(await screen.findByRole("group", { name: "Cadastro recebido." })).toBeInTheDocument()
      expect(fetched).toHaveBeenCalledTimes(2)
    })
  })

  describe("the two legal texts", () => {
    it("holds none of their words until one is asked for", () => {
      open()

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
      expect(document.body.textContent).not.toContain(A_SENTENCE_OF_THE_TERMS)
      expect(document.body.textContent).not.toContain(legalTexts.privacy.intro[0])
    })

    it.each([
      ["termos de uso", legalTexts.terms],
      ["política de privacidade", legalTexts.privacy],
    ])("reads the %s in a dialog over the form, whole and as the page draws them, and sends nothing for it", async (link, document_) => {
      const fetched = answers(taken)
      const { user } = open()

      await user.click(screen.getByRole("link", { name: link }))

      const dialog = await screen.findByRole("dialog", { name: document_.title })
      expect(await within(dialog).findByText(document_.intro[0]!)).toBeInTheDocument()
      expect(dialog).toHaveAccessibleDescription(document_.effective)
      expect(within(dialog).getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual(document_.sections.map((section, at) => `${at + 1}. ${section.heading}`))
      expect(within(dialog).getAllByRole("listitem")).toHaveLength(document_.sections.flatMap((section) => section.blocks).reduce((items, block) => items + (block.kind === "list" ? block.items.length : 0), 0))
      expect(fetched).not.toHaveBeenCalled()
    })

    it("keeps what was typed while a text is read, and gives the focus back to the link that opened it", async () => {
      const { user } = open()
      await fill(user)

      await user.click(screen.getByRole("link", { name: "política de privacidade" }))
      await screen.findByRole("dialog", { name: "Política de privacidade" })
      await user.keyboard("{Escape}")

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
      await waitFor(() => expect(screen.getByRole("link", { name: "política de privacidade" })).toHaveFocus())
      expect(field("Nome completo")).toHaveValue("Zuleica Tavares")
      expect(field("CPF")).toHaveValue("529.982.247-25")
      expect(screen.getByRole("checkbox", { name: /Li e aceito/ })).toBeChecked()
      expect(send()).toBeEnabled()
    })

    it("reads the other text after the first, each under its own name", async () => {
      const { user } = open()

      await user.click(screen.getByRole("link", { name: "termos de uso" }))
      await screen.findByRole("dialog", { name: "Termos de uso" })
      await user.click(screen.getByRole("button", { name: "Fechar" }))
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
      await user.click(screen.getByRole("link", { name: "política de privacidade" }))

      const dialog = await screen.findByRole("dialog", { name: "Política de privacidade" })
      expect(await within(dialog).findByText(legalTexts.privacy.intro[0]!)).toBeInTheDocument()
      expect(within(dialog).queryByText(legalTexts.terms.intro[0]!)).not.toBeInTheDocument()
    })
  })
})
