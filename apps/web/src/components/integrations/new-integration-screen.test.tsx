// Libs
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { MelhorEnvioConnection } from "@harness-monorepo/contracts"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { NewIntegrationScreen } from "./new-integration-screen"

const mocks = vi.hoisted(() => ({ connection: vi.fn() }))
vi.mock("@/services/integrations/integration-hooks", () => ({ useMelhorEnvioConnection: mocks.connection }))

const never: MelhorEnvioConnection = { available: true, environment: "PRODUCTION", status: "DISCONNECTED", account: null, connectedAt: null, accessExpiresAt: null }
const view = () => render(<NewIntegrationScreen slug="mutante" messages={ui} />)

beforeEach(() => {
  mocks.connection.mockReturnValue({ isPending: false, isError: false, data: never })
})

describe("NewIntegrationScreen", () => {
  it("offers Melhor Envio to connect, with the way back to the list", () => {
    view()

    expect(screen.getByRole("heading", { level: 1, name: "Nova integração" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Integrações" })).toHaveAttribute("href", "/admin/mutante/integrations")
    expect(screen.getByRole("link", { name: "Conectar Melhor Envio" })).toHaveAttribute("href", "/api/stores/mutante/integrations/melhor-envio/connect")
  })

  it("leads to the page of one already connected instead of connecting it again", () => {
    mocks.connection.mockReturnValue({ isPending: false, isError: false, data: { ...never, status: "CONNECTED", account: { name: "Mutante", email: null } } })
    view()

    expect(screen.queryByRole("link", { name: "Conectar Melhor Envio" })).toBeNull()
    expect(screen.getByRole("link", { name: "Configurar Melhor Envio" })).toHaveAttribute("href", "/admin/mutante/integrations/melhor-envio")
  })

  it("says when this installation has no Melhor Envio app set up", () => {
    mocks.connection.mockReturnValue({ isPending: false, isError: false, data: { ...never, available: false } })
    view()

    expect(screen.getByText("O Melhor Envio ainda não está configurado nesta instalação.")).toBeInTheDocument()
  })

  it("holds its place while the connection is read", () => {
    mocks.connection.mockReturnValue({ isPending: true, isError: false })
    const { container } = view()

    expect(container.querySelector("[aria-hidden='true']")).not.toBeNull()
    expect(screen.queryByRole("link", { name: "Conectar Melhor Envio" })).toBeNull()
  })
})
