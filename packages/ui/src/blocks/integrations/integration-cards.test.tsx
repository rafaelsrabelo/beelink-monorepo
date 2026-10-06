// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// UI
import type { IntegrationCardView } from "@harness-monorepo/ui/lib/integrations"

// Locales
import { en } from "@harness-monorepo/ui/locales/index"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import type { LinkComponent } from "../auth/auth-link"
import { IntegrationCards } from "./integration-cards"
import { ASAAS_LOGO, BEEFLOW_LOGO, MELHOR_ENVIO_LOGO, asaasCard, beeflowUpcoming, melhorEnvioCard } from "./integrations.fixtures"

/** The app's link, as a test can tell it from a plain anchor. */
const AppLink: LinkComponent = ({ href, ...props }) => <a href={href} data-app-link="" {...props} />

const show = (cards: IntegrationCardView[], onRetry = vi.fn()) => ({ ...render(<IntegrationCards cards={cards} onRetry={onRetry} linkComponent={AppLink} />), onRetry })
const card = (name: string) => screen.getByRole("article", { name })
const connected = (view: IntegrationCardView, account: string, sandbox = false): IntegrationCardView => ({ ...view, connection: { state: "connected", account, sandbox } })
const mending = (view: IntegrationCardView, account: string): IntegrationCardView => ({ ...view, connection: { state: "needsReconnect", account, sandbox: false } })

describe("IntegrationCards", () => {
  /** BEELINK-278: a shop whose Asaas account is still being looked at was shown as "Conectado" while every charge was refused. */
  it("never shows as connected one whose account was not approved: it warns, and leads to its page rather than to connecting again", async () => {
    const { container } = show([connected(melhorEnvioCard, "Loja Lessari"), { ...asaasCard, connection: { state: "unapproved", account: "Lessari Moda LTDA", sandbox: false } }])
    const asaas = within(card("Asaas"))

    expect(asaas.getByText("Conta não aprovada")).toBeInTheDocument()
    expect(asaas.queryByText("Conectado")).toBeNull()
    expect(asaas.getByRole("alert")).toHaveTextContent(/o pagamento pelo site fica desligado até lá/)
    expect(asaas.getByText("Conta: Lessari Moda LTDA")).toBeInTheDocument()
    expect(asaas.getByRole("link", { name: "Configurar Asaas" })).toHaveAttribute("href", "/admin/lessari/integrations/asaas")
    expect(asaas.queryByRole("link", { name: /Conectar|Reconectar/ })).toBeNull()
    await expectNoA11yViolations(container)
  })

  it("shows every third party there is, connected or not, each under its own mark and name", async () => {
    const { container } = show([melhorEnvioCard, asaasCard])

    expect(screen.getAllByRole("listitem")).toHaveLength(2)
    expect(screen.getByRole("heading", { level: 2, name: "Melhor Envio" })).toBeInTheDocument()
    expect(within(card("Asaas")).getByText("Pix e cartão de crédito no checkout. O dinheiro cai direto na conta Asaas da loja.")).toBeInTheDocument()
    // The name is written beside each mark, so the mark is read out as nothing.
    const marks = [...container.querySelectorAll("img")]
    expect(marks.map((mark) => mark.getAttribute("src"))).toEqual([MELHOR_ENVIO_LOGO, ASAAS_LOGO])
    expect(marks.map((mark) => mark.getAttribute("alt"))).toEqual(["", ""])
    // Nothing on its way unless the page is handed it.
    expect(screen.queryByText("Em breve")).toBeNull()
    await expectNoA11yViolations(container)
  })

  /**
   * Fetching Melhor Envio's way in begins an authorization, so a router link — which prefetches —
   * must never hold it. Asaas's way in is only its own page, where the key is typed.
   */
  it("offers to connect one the shop has not: an authorization on a plain anchor, a key's page on the app's link", () => {
    show([melhorEnvioCard, asaasCard])

    const melhorEnvio = within(card("Melhor Envio")).getByRole("link", { name: "Conectar Melhor Envio" })
    expect(melhorEnvio).toHaveTextContent(/^Conectar$/)
    expect(melhorEnvio).toHaveAttribute("href", "/api/stores/lessari/integrations/melhor-envio/connect")
    expect(melhorEnvio).not.toHaveAttribute("data-app-link")

    const asaas = within(card("Asaas")).getByRole("link", { name: "Conectar Asaas" })
    expect(asaas).toHaveAttribute("href", "/admin/lessari/integrations/asaas")
    expect(asaas).toHaveAttribute("data-app-link")
    // The key is typed on Asaas's own page, never on the list.
    expect(screen.queryByRole("textbox")).toBeNull()
    expect(within(card("Asaas")).getByText("Não conectado")).toBeInTheDocument()
    expect(screen.queryByText("Conectado")).toBeNull()
  })

  it("marks a connected one in green, says whose account it is, and leads to its page instead of connecting twice", async () => {
    const { container } = show([connected(melhorEnvioCard, "Loja Lessari", true), asaasCard])

    const melhorEnvio = within(card("Melhor Envio"))
    expect(melhorEnvio.getByText("Conectado")).toHaveAttribute("data-variant", "success")
    expect(melhorEnvio.getByText("Conta: Loja Lessari")).toBeInTheDocument()
    expect(melhorEnvio.getByText("Sandbox")).toHaveAttribute("title", "Ambiente de testes do Melhor Envio: as etiquetas são simuladas.")
    expect(melhorEnvio.queryByRole("link", { name: "Conectar Melhor Envio" })).toBeNull()
    const configure = melhorEnvio.getByRole("link", { name: "Configurar Melhor Envio" })
    expect(configure).toHaveTextContent(/^Configurar$/)
    expect(configure).toHaveAttribute("href", "/admin/lessari/integrations/melhor-envio")
    expect(configure).toHaveAttribute("data-app-link")
    await expectNoA11yViolations(container)
  })

  it("warns of one the third party stopped accepting, in red, and offers to connect it again", async () => {
    const { container } = show([mending(melhorEnvioCard, "Loja Lessari"), mending(asaasCard, "Lessari Moda LTDA")])

    const melhorEnvio = within(card("Melhor Envio"))
    expect(melhorEnvio.getByText("Precisa reconectar")).toHaveAttribute("data-variant", "destructive")
    expect(melhorEnvio.getByRole("alert")).toHaveTextContent("O Melhor Envio parou de aceitar esta conexão.")
    expect(melhorEnvio.queryByText("Conectado")).toBeNull()
    const again = melhorEnvio.getByRole("link", { name: "Reconectar Melhor Envio" })
    expect(again).toHaveAttribute("href", "/api/stores/lessari/integrations/melhor-envio/connect")
    expect(again).not.toHaveAttribute("data-app-link")
    // Its page is where it is disconnected: it stays within reach.
    expect(melhorEnvio.getByRole("link", { name: "Configurar Melhor Envio" })).toHaveAttribute("href", "/admin/lessari/integrations/melhor-envio")

    // Mending Asaas is typing a key on its page: one way there, not two.
    const asaas = within(card("Asaas"))
    expect(asaas.getByRole("alert")).toHaveTextContent("O Asaas parou de aceitar a chave desta loja.")
    expect(asaas.getAllByRole("link")).toHaveLength(1)
    expect(asaas.getByRole("link", { name: "Reconectar Asaas" })).toHaveAttribute("href", "/admin/lessari/integrations/asaas")
    await expectNoA11yViolations(container)
  })

  it("says when this installation has nothing set up to connect to, offering nothing to press", () => {
    show([{ ...melhorEnvioCard, connection: { state: "unavailable", account: null, sandbox: true } }, asaasCard])

    const melhorEnvio = within(card("Melhor Envio"))
    expect(melhorEnvio.getByText("O Melhor Envio ainda não está configurado nesta instalação.")).toBeInTheDocument()
    expect(melhorEnvio.queryByRole("link")).toBeNull()
    expect(melhorEnvio.queryByText("Sandbox")).toBeNull()
    expect(melhorEnvio.queryByText("Não conectado")).toBeNull()
    expect(within(card("Asaas")).getByRole("link", { name: "Conectar Asaas" })).toBeInTheDocument()
  })

  it("holds only what is being read as grey shapes: who each is and what it gives are already there", async () => {
    const { container } = show([{ ...melhorEnvioCard, connection: "loading" }, connected(asaasCard, "Lessari Moda LTDA")])

    expect(card("Melhor Envio")).toHaveAttribute("aria-busy", "true")
    expect(within(card("Melhor Envio")).getByText(/Frete por Correios, Jadlog/)).toBeInTheDocument()
    expect(within(card("Melhor Envio")).queryByRole("link")).toBeNull()
    expect(within(card("Melhor Envio")).queryByText("Não conectado")).toBeNull()
    expect(card("Melhor Envio").querySelectorAll("[aria-hidden='true'][data-slot='skeleton']")).toHaveLength(2)
    // One read never waits on another.
    expect(card("Asaas")).not.toHaveAttribute("aria-busy")
    expect(within(card("Asaas")).getByText("Conectado")).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })

  /** A read that failed is not a shop with nothing connected: it may well be connected. */
  it("says a read that failed in its own card alone, and reads that one again", async () => {
    const { container, onRetry } = show([connected(melhorEnvioCard, "Loja Lessari"), { ...asaasCard, connection: "failed" }])

    expect(screen.getAllByRole("alert")).toHaveLength(1)
    const asaas = within(card("Asaas"))
    expect(asaas.getByRole("alert")).toHaveTextContent("Não foi possível carregar esta integração.")
    expect(asaas.queryByRole("link")).toBeNull()
    expect(asaas.queryByText("Não conectado")).toBeNull()
    expect(within(card("Melhor Envio")).getByRole("link", { name: "Configurar Melhor Envio" })).toBeInTheDocument()

    await userEvent.click(asaas.getByRole("button", { name: "Tentar de novo: Asaas" }))
    expect(onRetry).toHaveBeenCalledExactlyOnceWith("ASAAS")
    await expectNoA11yViolations(container)
  })

  /** BeeFlow has no API, no page and no way in yet: its card announces it and offers nothing to follow or press. */
  it("announces what is on its way after what there is, with nothing to follow or press, and no price", async () => {
    const { container } = render(<IntegrationCards cards={[melhorEnvioCard, asaasCard]} onRetry={() => {}} upcoming={[beeflowUpcoming]} />)

    expect(screen.getAllByRole("listitem")).toHaveLength(3)
    const beeflow = within(screen.getAllByRole("listitem")[2]!)
    expect(beeflow.getByRole("heading", { level: 2, name: "BeeFlow" })).toBeInTheDocument()
    expect(beeflow.getByText("Em breve")).toHaveAttribute("data-variant", "outline")
    expect(beeflow.getByText(/avisos de pedido, cupons e promoções, e atendimento automático/)).toBeInTheDocument()
    expect(beeflow.getByText("Disponível em breve.")).toBeInTheDocument()
    expect(container.querySelector(`img[src="${BEEFLOW_LOGO}"]`)).toHaveAttribute("alt", "")
    expect(beeflow.queryByRole("link")).toBeNull()
    expect(beeflow.queryByRole("button")).toBeNull()
    expect(beeflow.queryByRole("alert")).toBeNull()
    expect(beeflow.queryByText(/R\$/)).toBeNull()
    expect(card("BeeFlow")).not.toHaveAttribute("aria-busy")
    await expectNoA11yViolations(container)
  })

  it("speaks the language it is handed", () => {
    render(<IntegrationCards cards={[connected(melhorEnvioCard, "Loja Lessari"), asaasCard]} onRetry={() => {}} messages={en} />)

    expect(screen.getByRole("link", { name: "Set up Melhor Envio" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Connect Asaas" })).toHaveTextContent(/^Connect$/)
    expect(screen.getByText("Account: Loja Lessari")).toBeInTheDocument()
  })
})
