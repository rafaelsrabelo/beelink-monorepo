// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { MelhorEnvioConnection } from "@harness-monorepo/contracts"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { IntegrationsScreen } from "./integrations-screen"

const mocks = vi.hoisted(() => ({ connection: vi.fn() }))
vi.mock("@/services/integrations/integration-hooks", () => ({ useMelhorEnvioConnection: mocks.connection }))

const connected: MelhorEnvioConnection = { available: true, environment: "PRODUCTION", status: "CONNECTED", account: { name: "Mutante Suplementos", email: null }, connectedAt: "2026-10-02T12:00:00.000Z", accessExpiresAt: "2026-11-01T12:00:00.000Z" }

beforeEach(() => {
  mocks.connection.mockReturnValue({ isPending: false, isError: false, data: connected })
})

describe("IntegrationsScreen", () => {
  it("lists what the shop connected, each leading to its own page, and offers to add another", () => {
    render(<IntegrationsScreen slug="mutante" messages={ui} />)

    expect(screen.getByRole("heading", { level: 1, name: "Integrações" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Nova integração" })).toHaveAttribute("href", "/admin/mutante/integrations/new")
    expect(screen.getByText("Conta: Mutante Suplementos")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Configurar Melhor Envio" })).toHaveAttribute("href", "/admin/mutante/integrations/melhor-envio")
    // A list, not a form: nothing is set up here.
    expect(screen.queryByRole("textbox")).toBeNull()
  })

  it("keeps one Melhor Envio stopped accepting on the list, to be mended", () => {
    mocks.connection.mockReturnValue({ isPending: false, isError: false, data: { ...connected, status: "NEEDS_RECONNECT" } })
    render(<IntegrationsScreen slug="mutante" messages={ui} />)

    expect(screen.getByText("Precisa reconectar")).toBeInTheDocument()
  })

  it("says a shop that connected nothing has nothing, and leads to adding one", () => {
    mocks.connection.mockReturnValue({ isPending: false, isError: false, data: { ...connected, status: "DISCONNECTED", account: null } })
    render(<IntegrationsScreen slug="mutante" messages={ui} />)

    expect(screen.getByText("Nenhuma integração conectada.")).toBeInTheDocument()
    expect(screen.getAllByRole("link", { name: "Nova integração" })).toHaveLength(2)
  })

  it("holds the list's place while read, and offers to read again when that failed", async () => {
    mocks.connection.mockReturnValue({ isPending: true, isError: false })
    const loading = render(<IntegrationsScreen slug="mutante" messages={ui} />)
    expect(screen.queryByText("Nenhuma integração conectada.")).toBeNull()
    loading.unmount()

    const refetch = vi.fn()
    mocks.connection.mockReturnValue({ isPending: false, isError: true, refetch })
    render(<IntegrationsScreen slug="mutante" messages={ui} />)
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }))
    expect(refetch).toHaveBeenCalledOnce()
  })
})
