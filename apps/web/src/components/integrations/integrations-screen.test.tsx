// Libs
import { render, screen } from "@testing-library/react"
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

beforeEach(() => {
  mocks.connection.mockReturnValue(read(connected))
  mocks.asaas.mockReturnValue(read(asaasNever))
})

describe("IntegrationsScreen", () => {
  it("lists what the shop connected, each leading to its own page, and offers to add another", () => {
    render(<IntegrationsScreen slug="mutante" messages={ui} />)

    expect(screen.getByRole("heading", { level: 1, name: "Integrações" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Nova integração" })).toHaveAttribute("href", "/admin/mutante/integrations/new")
    expect(screen.getByText("Conta: Mutante Suplementos")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Configurar Melhor Envio" })).toHaveAttribute("href", "/admin/mutante/integrations/melhor-envio")
    // Asaas was never connected: it is not on the list, and adding it is the other page's.
    expect(screen.queryByRole("link", { name: "Configurar Asaas" })).toBeNull()
    // A list, not a form: nothing is set up here.
    expect(screen.queryByRole("textbox")).toBeNull()
  })

  /** BEELINK-203: both connections are asked for, each of its own shop. */
  it("lists Asaas once the shop connected it, with its account and the sandbox, leading to its page", () => {
    mocks.asaas.mockReturnValue(read(asaasConnected))
    render(<IntegrationsScreen slug="mutante" messages={ui} />)

    expect(mocks.asaas).toHaveBeenCalledWith("mutante")
    expect(screen.getAllByRole("listitem")).toHaveLength(2)
    expect(screen.getByText("Conta: Mutante Suplementos LTDA")).toBeInTheDocument()
    expect(screen.getByText("Sandbox")).toHaveAttribute("title", "Ambiente de testes do Asaas: nada é cobrado de verdade.")
    expect(screen.getByRole("link", { name: "Configurar Asaas" })).toHaveAttribute("href", "/admin/mutante/integrations/asaas")
  })

  it("keeps one a third party stopped accepting on the list, to be mended", () => {
    mocks.connection.mockReturnValue(read({ ...connected, status: "NEEDS_RECONNECT" }))
    mocks.asaas.mockReturnValue(read({ ...asaasConnected, status: "NEEDS_RECONNECT" }))
    render(<IntegrationsScreen slug="mutante" messages={ui} />)

    expect(screen.getAllByText("Precisa reconectar")).toHaveLength(2)
  })

  it("says a shop that connected nothing has nothing, and leads to adding one", () => {
    mocks.connection.mockReturnValue(read({ ...connected, status: "DISCONNECTED", account: null }))
    render(<IntegrationsScreen slug="mutante" messages={ui} />)

    expect(screen.getByText("Nenhuma integração conectada.")).toBeInTheDocument()
    expect(screen.getAllByRole("link", { name: "Nova integração" })).toHaveLength(2)
  })

  it("holds the list's place while either connection is read", () => {
    mocks.asaas.mockReturnValue(reading)
    render(<IntegrationsScreen slug="mutante" messages={ui} />)

    expect(screen.queryByText("Conta: Mutante Suplementos")).toBeNull()
    expect(screen.queryByText("Nenhuma integração conectada.")).toBeNull()
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("offers to read again when neither connection could be read", async () => {
    const [melhorEnvio, asaas] = [vi.fn(), vi.fn()]
    mocks.connection.mockReturnValue(unread(melhorEnvio))
    mocks.asaas.mockReturnValue(unread(asaas))
    render(<IntegrationsScreen slug="mutante" messages={ui} />)

    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar as integrações.")
    expect(screen.queryByText("Nenhuma integração conectada.")).toBeNull()
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }))
    expect([melhorEnvio, asaas].map((refetch) => refetch.mock.calls.length)).toEqual([1, 1])
  })

  /** BEELINK-203: one read failing does not hide what the other brought. */
  it("shows the connection that was read beside the one that could not be, and reads only that one again", async () => {
    const refetch = vi.fn()
    mocks.asaas.mockReturnValue(unread(refetch))
    render(<IntegrationsScreen slug="mutante" messages={ui} />)

    expect(screen.getByRole("link", { name: "Configurar Melhor Envio" })).toBeInTheDocument()
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar todas as integrações.")
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  /** A read that failed is not a shop with nothing connected: it may well be connected. */
  it("never says the shop connected nothing while one of the reads is missing", () => {
    mocks.connection.mockReturnValue(unread())
    render(<IntegrationsScreen slug="mutante" messages={ui} />)

    expect(screen.queryByText("Nenhuma integração conectada.")).toBeNull()
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar todas as integrações.")
  })
})
