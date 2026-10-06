// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { AsaasConnection, MelhorEnvioConnection } from "@harness-monorepo/contracts"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { NewIntegrationScreen } from "./new-integration-screen"

const mocks = vi.hoisted(() => ({ connection: vi.fn(), asaas: vi.fn() }))
vi.mock("@/services/integrations/integration-hooks", () => ({ useMelhorEnvioConnection: mocks.connection }))
vi.mock("@/services/integrations/asaas-hooks", () => ({ useAsaasConnection: mocks.asaas }))

const never: MelhorEnvioConnection = { available: true, environment: "PRODUCTION", status: "DISCONNECTED", account: null, connectedAt: null, accessExpiresAt: null }
const asaasNever: AsaasConnection = { available: true, environment: "PRODUCTION", status: "DISCONNECTED", account: null, webhook: null, connectedAt: null }
const view = () => render(<NewIntegrationScreen slug="mutante" messages={ui} />)

const read = (data: object) => ({ isPending: false, isError: false, data })

beforeEach(() => {
  mocks.connection.mockReturnValue(read(never))
  mocks.asaas.mockReturnValue(read(asaasNever))
})

describe("NewIntegrationScreen", () => {
  it("offers Melhor Envio to connect, with the way back to the list", () => {
    view()

    expect(screen.getByRole("heading", { level: 1, name: "Nova integração" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Integrações" })).toHaveAttribute("href", "/admin/mutante/integrations")
    expect(screen.getByRole("link", { name: "Conectar Melhor Envio" })).toHaveAttribute("href", "/api/stores/mutante/integrations/melhor-envio/connect")
  })

  /** BEELINK-203: connecting Asaas is typing its key, and that happens on its own page. */
  it("offers Asaas beside it, leading to the page where its key is typed", () => {
    view()

    expect(screen.getByRole("heading", { level: 2, name: "Asaas" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Conectar Asaas" })).toHaveAttribute("href", "/admin/mutante/integrations/asaas")
    // Nothing is typed here: the key's field is the other page's.
    expect(screen.queryByRole("textbox")).toBeNull()
  })

  it("leads to the page of one already connected instead of connecting it again", () => {
    mocks.connection.mockReturnValue(read({ ...never, status: "CONNECTED", account: { name: "Mutante", email: null } }))
    mocks.asaas.mockReturnValue(read({ ...asaasNever, status: "NEEDS_RECONNECT", account: { name: "Mutante LTDA", document: null }, webhook: "REGISTERED", connectedAt: "2026-10-05T12:00:00.000Z" }))
    view()

    expect(screen.queryByRole("link", { name: "Conectar Melhor Envio" })).toBeNull()
    expect(screen.getByRole("link", { name: "Configurar Melhor Envio" })).toHaveAttribute("href", "/admin/mutante/integrations/melhor-envio")
    expect(screen.queryByRole("link", { name: "Conectar Asaas" })).toBeNull()
    expect(screen.getByRole("link", { name: "Configurar Asaas" })).toHaveAttribute("href", "/admin/mutante/integrations/asaas")
  })

  it("says when this installation has no Melhor Envio app set up, or nowhere to seal an Asaas key", () => {
    mocks.connection.mockReturnValue(read({ ...never, available: false }))
    mocks.asaas.mockReturnValue(read({ ...asaasNever, available: false }))
    view()

    expect(screen.getByText("O Melhor Envio ainda não está configurado nesta instalação.")).toBeInTheDocument()
    expect(screen.getByText("O Asaas ainda não está configurado nesta instalação.")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /Conectar/ })).toBeNull()
  })

  it("holds its place while either connection is read", () => {
    mocks.asaas.mockReturnValue({ isPending: true, isError: false })
    const { container } = view()

    expect(container.querySelector("[aria-hidden='true']")).not.toBeNull()
    expect(screen.queryByRole("link", { name: "Conectar Melhor Envio" })).toBeNull()
  })

  /** BEELINK-203: one read failing does not hide what the other brought. */
  it("offers what was read beside what could not be, and reads only that one again", async () => {
    const refetch = vi.fn()
    mocks.connection.mockReturnValue({ isPending: false, isError: true, refetch })
    view()

    expect(screen.getByRole("link", { name: "Conectar Asaas" })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { level: 2, name: "Melhor Envio" })).toBeNull()
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar todas as integrações.")
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  it("offers to read again when neither could be read", () => {
    mocks.connection.mockReturnValue({ isPending: false, isError: true, refetch: vi.fn() })
    mocks.asaas.mockReturnValue({ isPending: false, isError: true, refetch: vi.fn() })
    view()

    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar as integrações.")
    expect(screen.queryByRole("link", { name: /Conectar/ })).toBeNull()
  })
})
