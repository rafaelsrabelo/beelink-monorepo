// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { AsaasConnection, MelhorEnvioConnection } from "@harness-monorepo/contracts"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { IntegrationsScreen } from "./integrations-screen"

const mocks = vi.hoisted(() => ({ connection: vi.fn(), asaas: vi.fn() }))
vi.mock("@/services/integrations/integration-hooks", () => ({ useMelhorEnvioConnection: mocks.connection }))
vi.mock("@/services/integrations/asaas-hooks", () => ({ useAsaasConnection: mocks.asaas }))

const connected: MelhorEnvioConnection = { available: true, environment: "PRODUCTION", status: "CONNECTED", account: { name: "Mutante Suplementos", email: null }, connectedAt: "2026-10-02T12:00:00.000Z", accessExpiresAt: "2026-11-01T12:00:00.000Z" }
const asaasNever: AsaasConnection = { available: true, environment: "SANDBOX", status: "DISCONNECTED", account: null, webhook: null, connectedAt: null }
const asaasConnected: AsaasConnection = { ...asaasNever, status: "CONNECTED", account: { name: "Mutante Suplementos LTDA", document: "**.222.333/0001-**" }, webhook: "SKIPPED", connectedAt: "2026-10-05T12:00:00.000Z" }

const read = (data: object) => ({ isPending: false, isError: false, data })
const reading = { isPending: true, isError: false }
const unread = (refetch = vi.fn()) => ({ isPending: false, isError: true, refetch })

const card = (name: string) => within(screen.getByRole("article", { name }))
const view = () => render(<IntegrationsScreen slug="mutante" messages={ui} />)

beforeEach(() => {
  mocks.connection.mockReturnValue(read(connected))
  mocks.asaas.mockReturnValue(read(asaasNever))
})

describe("IntegrationsScreen", () => {
  it("shows every integration there is on one page, connected or not, under each brand's own mark", () => {
    const { container } = view()

    expect(screen.getByRole("heading", { level: 1, name: "Integrações" })).toBeInTheDocument()
    expect(mocks.connection).toHaveBeenCalledWith("mutante")
    expect(mocks.asaas).toHaveBeenCalledWith("mutante")
    expect(screen.getAllByRole("article")).toHaveLength(3)
    expect([...container.querySelectorAll("img")].map((mark) => mark.getAttribute("src"))).toEqual(["/brand/integrations/melhor-envio-icon.png", "/brand/integrations/asaas-icon.png", "/brand/integrations/beeflow.png"])
    // One page: nothing leads to a second one to add an integration, and no list is ever empty.
    expect(screen.queryByRole("link", { name: "Nova integração" })).toBeNull()
    expect(container.querySelector("a[href$='/integrations/new']")).toBeNull()
  })

  it("announces BeeFlow after them as coming soon, with nothing to follow or press, whatever the reads say", () => {
    mocks.connection.mockReturnValue(reading)
    mocks.asaas.mockReturnValue(unread())
    view()

    expect(card("BeeFlow").getByText("Em breve")).toBeInTheDocument()
    expect(card("BeeFlow").getByText("Disponível em breve.")).toBeInTheDocument()
    expect(card("BeeFlow").queryByRole("link")).toBeNull()
    expect(card("BeeFlow").queryByRole("button")).toBeNull()
    expect(screen.getByRole("article", { name: "BeeFlow" })).not.toHaveAttribute("aria-busy")
  })

  it("marks the connected one, with its account, leading to its page", () => {
    view()

    expect(card("Melhor Envio").getByText("Conectado")).toHaveAttribute("data-variant", "success")
    expect(card("Melhor Envio").getByText("Conta: Mutante Suplementos")).toBeInTheDocument()
    expect(card("Melhor Envio").getByRole("link", { name: "Configurar Melhor Envio" })).toHaveAttribute("href", "/admin/mutante/integrations/melhor-envio")
    expect(card("Melhor Envio").queryByText("Sandbox")).toBeNull()
  })

  /** The key is typed on Asaas's own page: the list only leads there. */
  it("connects from the page: Asaas through its own page, Melhor Envio through the route that leaves for its authorization", () => {
    mocks.connection.mockReturnValue(read({ ...connected, status: "DISCONNECTED", account: null }))
    view()

    expect(card("Asaas").getByRole("link", { name: "Conectar Asaas" })).toHaveAttribute("href", "/admin/mutante/integrations/asaas")
    expect(card("Asaas").getByText("Sandbox")).toHaveAttribute("title", "Ambiente de testes do Asaas: nada é cobrado de verdade.")
    expect(card("Melhor Envio").getByRole("link", { name: "Conectar Melhor Envio" })).toHaveAttribute("href", "/api/stores/mutante/integrations/melhor-envio/connect")
    expect(screen.queryByText("Conectado")).toBeNull()
    expect(screen.queryByRole("textbox")).toBeNull()
  })

  it("warns of one a third party stopped accepting, and offers to connect it again", () => {
    mocks.connection.mockReturnValue(read({ ...connected, status: "NEEDS_RECONNECT" }))
    mocks.asaas.mockReturnValue(read({ ...asaasConnected, status: "NEEDS_RECONNECT" }))
    view()

    expect(screen.getAllByText("Precisa reconectar")).toHaveLength(2)
    expect(card("Melhor Envio").getByRole("link", { name: "Reconectar Melhor Envio" })).toHaveAttribute("href", "/api/stores/mutante/integrations/melhor-envio/connect")
    expect(card("Asaas").getByRole("link", { name: "Reconectar Asaas" })).toHaveAttribute("href", "/admin/mutante/integrations/asaas")
    expect(card("Asaas").getByText("Conta: Mutante Suplementos LTDA")).toBeInTheDocument()
  })

  it("says one is not set up on this installation, and still offers the other", () => {
    mocks.connection.mockReturnValue(read({ ...connected, available: false, status: "DISCONNECTED", account: null }))
    view()

    expect(card("Melhor Envio").getByText("O Melhor Envio ainda não está configurado nesta instalação.")).toBeInTheDocument()
    expect(card("Melhor Envio").queryByRole("link")).toBeNull()
    expect(card("Asaas").getByRole("link", { name: "Conectar Asaas" })).toBeInTheDocument()
  })

  it("holds one card's place while its connection is read, without holding back the other", () => {
    mocks.asaas.mockReturnValue(reading)
    view()

    expect(screen.getByRole("article", { name: "Asaas" })).toHaveAttribute("aria-busy", "true")
    expect(card("Asaas").queryByRole("link")).toBeNull()
    expect(card("Melhor Envio").getByText("Conta: Mutante Suplementos")).toBeInTheDocument()
    expect(screen.queryByRole("alert")).toBeNull()
  })

  /** One read failing does not hide what the other brought, and is never a shop that connected nothing. */
  it("says a read that failed in that card alone, and reads only that one again", async () => {
    const [melhorEnvio, asaas] = [vi.fn(), vi.fn()]
    mocks.connection.mockReturnValue({ ...read(connected), refetch: melhorEnvio })
    mocks.asaas.mockReturnValue(unread(asaas))
    view()

    expect(card("Melhor Envio").getByRole("link", { name: "Configurar Melhor Envio" })).toBeInTheDocument()
    expect(screen.getAllByRole("alert")).toHaveLength(1)
    expect(card("Asaas").getByRole("alert")).toHaveTextContent("Não foi possível carregar esta integração.")
    expect(card("Asaas").queryByText("Não conectado")).toBeNull()
    await userEvent.click(card("Asaas").getByRole("button", { name: "Tentar de novo: Asaas" }))
    expect([melhorEnvio, asaas].map((refetch) => refetch.mock.calls.length)).toEqual([0, 1])
  })

  it("offers each to be read again when neither could be", async () => {
    const [melhorEnvio, asaas] = [vi.fn(), vi.fn()]
    mocks.connection.mockReturnValue(unread(melhorEnvio))
    mocks.asaas.mockReturnValue(unread(asaas))
    view()

    expect(screen.getAllByRole("alert")).toHaveLength(2)
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo: Melhor Envio" }))
    expect([melhorEnvio, asaas].map((refetch) => refetch.mock.calls.length)).toEqual([1, 0])
  })
})
