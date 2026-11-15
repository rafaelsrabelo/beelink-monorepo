// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { AffiliateApplicationError } from "@/services/storefront/affiliate-application-requests"
import { StorefrontAffiliateJoinLive } from "./storefront-affiliate-join-live"

const mocks = vi.hoisted(() => ({ mutate: vi.fn(), state: { current: { isSuccess: false, isPending: false, error: null as Error | null } } }))
vi.mock("@/services/storefront/affiliate-application-hooks", () => ({ useSendAffiliateApplication: () => ({ mutate: mocks.mutate, reset: vi.fn(), ...mocks.state.current }) }))

const view = {
  badge: "Programa de afiliados",
  title: "Indique a Lessari e ganhe 10% em cada venda",
  subtitle: "Você recebe um link só seu.",
  ctaLabel: "Quero ser afiliado",
  highlights: ["Recebe por Pix"],
  imageUrl: null,
  stepsTitle: "Como funciona",
  steps: [{ title: "Candidate-se", text: "Leva um minuto." }],
  benefits: [],
  questionsTitle: "Perguntas frequentes",
  questions: [],
  closingTitle: "Pronto?",
  closingText: "Envie agora.",
}
const form = { title: "Quero ser afiliado", subtitle: "A Lessari responde no seu e-mail.", extraQuestion: null, note: "Seus dados ficam com a Lessari." }

const page = () =>
  render(<StorefrontAffiliateJoinLive slug="lessari" view={view} form={form} success="A Lessari vai analisar." terms="Pagamento por Pix." linkBase="lessari.com.br/" example={null} homeHref="/lessari" messages={ui} />)

beforeEach(() => {
  mocks.mutate.mockReset()
  mocks.state.current = { isSuccess: false, isPending: false, error: null }
  window.scrollTo = vi.fn()
})

describe("StorefrontAffiliateJoinLive (plan 2026-11-14)", () => {
  it("shows how a link looks, and opens the form in its place with one click", async () => {
    page()

    expect(screen.getByText("lessari.com.br/")).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole("button", { name: "Quero ser afiliado" })[0]!)
    expect(screen.getByRole("textbox", { name: "Nome completo" })).toBeInTheDocument()
    expect(screen.queryByText("lessari.com.br/")).toBeNull()
  })

  it("says what is missing before sending, and sends what was typed", async () => {
    page()
    await userEvent.click(screen.getAllByRole("button", { name: "Quero ser afiliado" })[0]!)

    await userEvent.click(screen.getByRole("button", { name: "Enviar candidatura" }))
    expect(mocks.mutate).not.toHaveBeenCalled()
    expect(screen.getByText(ui.affiliateJoin.form.issues.email)).toBeInTheDocument()

    await userEvent.type(screen.getByRole("textbox", { name: "Nome completo" }), "Ana Souza")
    await userEvent.type(screen.getByRole("textbox", { name: "E-mail" }), "ana@exemplo.com")
    await userEvent.type(screen.getByRole("textbox", { name: "WhatsApp" }), "11955554444")
    await userEvent.click(screen.getByRole("checkbox"))
    await userEvent.click(screen.getByRole("button", { name: "Enviar candidatura" }))
    expect(mocks.mutate).toHaveBeenCalledWith({ name: "Ana Souza", email: "ana@exemplo.com", phone: "(11) 95555-4444", extraAnswer: null, accepted: true })
  })

  it("opens the programme's terms over the page", async () => {
    page()
    await userEvent.click(screen.getAllByRole("button", { name: "Quero ser afiliado" })[0]!)
    await userEvent.click(screen.getByRole("button", { name: "termos do programa" }))
    expect(screen.getByRole("dialog", { name: "Termos do programa" })).toHaveTextContent("Pagamento por Pix.")
  })

  it("answers with the shop's message once sent, and says a refusal in words", async () => {
    mocks.state.current = { isSuccess: false, isPending: false, error: new AffiliateApplicationError("RATE_LIMITED") }
    const { rerender } = page()
    await userEvent.click(screen.getAllByRole("button", { name: "Quero ser afiliado" })[0]!)
    expect(screen.getByText(ui.affiliateJoin.form.errors.RATE_LIMITED)).toBeInTheDocument()

    mocks.state.current = { isSuccess: true, isPending: false, error: null }
    rerender(<StorefrontAffiliateJoinLive slug="lessari" view={view} form={form} success="A Lessari vai analisar." terms={null} linkBase="lessari.com.br/" example={null} homeHref="/lessari" messages={ui} />)
    expect(screen.getByRole("status", { name: "Recebemos sua candidatura!" })).toHaveTextContent("A Lessari vai analisar.")
  })
})
