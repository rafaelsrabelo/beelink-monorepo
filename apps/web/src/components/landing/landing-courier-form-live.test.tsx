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

/** Made up: a CPF whose check digits are right and an address nobody owns. */
const ZULEICA = { name: "Zuleica Tavares", document: "52998224725", email: "zuleica.tavares@exemplo.test", whatsapp: "85987654321" }

/** What the API is sent for her: exactly the wire's fields, the masks' punctuation still on. */
const SENT = {
  name: "Zuleica Tavares",
  document: "529.982.247-25",
  email: "zuleica.tavares@exemplo.test",
  whatsapp: "(85) 98765-4321",
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
const send = () => screen.getByRole("button", { name: /Enviar cadastro|Enviando|Tentar de novo/ })

async function fill(user: User) {
  await user.type(field("Nome completo"), ZULEICA.name)
  await user.type(field("CPF"), ZULEICA.document)
  await user.type(field("E-mail"), ZULEICA.email)
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

  it("posts the application to this app's own route with the wire's fields and no other, and gives its place to the confirmation", async () => {
    const fetched = answers(taken)
    const { user } = open()
    await fill(user)

    await user.click(send())

    expect(await screen.findByRole("group", { name: "Cadastro recebido." })).toBeInTheDocument()
    expect(screen.getByText("Em breve você recebe no seu e-mail as informações para concluir o cadastro.")).toBeVisible()
    expect(fetched).toHaveBeenCalledTimes(1)
    expect(fetched.mock.calls[0]![0]).toBe("/api/courier-applications")
    expect(fetched.mock.calls[0]![1]?.method).toBe("POST")
    // The API refuses a body with one field more than these.
    expect(bodyOf(fetched)).toEqual(SENT)
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
      expect(field("E-mail")).toHaveValue("zuleica.tavares@exemplo.test")
      expect(field("WhatsApp")).toHaveValue("(85) 98765-4321")
      expect(screen.getByRole("checkbox", { name: /Li e aceito/ })).toBeChecked()
    }

    // BEELINK-325: a 409, since nothing is wrong with what was typed — it is on the list already.
    it.each([
      ["COURIER_DOCUMENT_TAKEN", "CPF", "Este CPF já está cadastrado."],
      ["COURIER_EMAIL_TAKEN", "E-mail", "Este e-mail já está cadastrado."],
      ["COURIER_WHATSAPP_TAKEN", "WhatsApp", "Este WhatsApp já está cadastrado."],
    ])("says %s on its own field, takes the person there, keeps the form and offers no send again", async (code, label, sentence) => {
      answers(refusal(409, code))
      const { user } = open()
      await fill(user)

      await user.click(send())

      await waitFor(() => expect(field(label)).toHaveAccessibleDescription(expect.stringContaining(sentence)))
      expect(field(label)).toHaveAttribute("aria-invalid", "true")
      expect(field(label)).toHaveFocus()
      expect(screen.queryByRole("button", { name: "Tentar de novo" })).not.toBeInTheDocument()
      expect(screen.queryByText("Cadastro recebido.")).not.toBeInTheDocument()
    })

    it.each([
      ["COURIER_NAME_INVALID", "Nome completo", "Informe o nome completo, com sobrenome."],
      ["COURIER_DOCUMENT_INVALID", "CPF", "Esse CPF não confere. Confira os números."],
      ["COURIER_EMAIL_INVALID", "E-mail", "Informe um e-mail válido."],
      ["COURIER_WHATSAPP_INVALID", "WhatsApp", "Informe um celular com DDD."],
      ["COURIER_CITY_NOT_OPEN", "Cidade onde quer entregar", "O cadastro ainda não está aberto para essa cidade."],
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
      expect(send()).toHaveAccessibleName("Enviar cadastro")
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

    expect(await screen.findByRole("form", { name: "Comece seu cadastro" })).toBeInTheDocument()
    expect(field("CPF")).toHaveValue("")
    expect(send()).toBeDisabled()

    await user.type(field("Nome completo"), "Raimundo Nonato")
    await user.type(field("CPF"), "11144477735")
    await user.type(field("E-mail"), "raimundo.nonato@exemplo.test")
    await user.type(field("WhatsApp"), "85912345678")
    await user.click(screen.getByRole("checkbox", { name: /Li e aceito/ }))
    await user.click(send())

    await screen.findByRole("group", { name: "Cadastro recebido." })
    expect(fetched).toHaveBeenCalledTimes(2)
    expect(bodyOf(fetched, 1)).toMatchObject({ name: "Raimundo Nonato", document: "111.444.777-35", whatsapp: "(85) 91234-5678" })
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
