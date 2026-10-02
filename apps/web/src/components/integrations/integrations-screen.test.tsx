// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { MelhorEnvioConnection, MelhorEnvioSettings } from "@harness-monorepo/contracts"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { IntegrationError } from "@/services/integrations/integration-requests"
import { IntegrationsScreen } from "./integrations-screen"

const mocks = vi.hoisted(() => ({ connection: vi.fn(), account: vi.fn(), settings: vi.fn(), save: vi.fn(), disconnect: vi.fn() }))
vi.mock("@/services/integrations/integration-hooks", () => ({
  useMelhorEnvioConnection: mocks.connection,
  useMelhorEnvioAccount: mocks.account,
  useMelhorEnvioSettings: mocks.settings,
  useSaveMelhorEnvioSettings: mocks.save,
  useDisconnectMelhorEnvio: mocks.disconnect,
}))

const connected: MelhorEnvioConnection = { available: true, environment: "SANDBOX", status: "CONNECTED", account: { name: "Loja Lessari", email: null }, connectedAt: "2026-10-02T12:00:00.000Z", accessExpiresAt: "2026-11-01T12:00:00.000Z" }
const never: MelhorEnvioSettings = { handlingDays: 1, serviceIds: null, defaultPackage: null, updatedAt: null }
const services = [
  { id: 1, name: "PAC", company: "Correios" },
  { id: 2, name: "SEDEX", company: "Correios" },
]
const mutate = vi.fn()
const disconnect = vi.fn()
const flat = (text: string | null | undefined) => text?.replace(/\s/g, " ")

function with_(state: { connection?: MelhorEnvioConnection; account?: object; settings?: MelhorEnvioSettings; saveError?: Error | null }) {
  mocks.connection.mockReturnValue({ isPending: false, isError: false, data: state.connection ?? connected })
  mocks.account.mockReturnValue(state.account ?? { isPending: false, isError: false, data: { balanceCents: 162490, services } })
  mocks.settings.mockReturnValue({ isPending: false, isError: false, data: state.settings ?? never })
  mocks.save.mockReturnValue({ mutate, reset: vi.fn(), isPending: false, error: state.saveError ?? null, isSuccess: false })
  mocks.disconnect.mockReturnValue({ mutate: disconnect, isPending: false, isError: false })
}

beforeEach(() => {
  mutate.mockReset()
  disconnect.mockReset()
  with_({})
})

describe("IntegrationsScreen (BEELINK-183)", () => {
  it("shows the connected account, its wallet, and the carrier settings with every service on for a shop that never chose", () => {
    render(<IntegrationsScreen slug="loja" result={null} locale="pt-BR" messages={ui} />)

    expect(screen.getByRole("heading", { level: 1, name: "Integrações" })).toBeInTheDocument()
    expect(flat(screen.getByText("Saldo da carteira").nextElementSibling?.textContent)).toContain("R$ 1.624,90")
    expect(screen.getByRole("switch", { name: "PAC" })).toBeChecked()
    expect(screen.getByRole("switch", { name: "SEDEX" })).toBeChecked()
    // The wallet is asked of a connected shop only.
    expect(mocks.account).toHaveBeenCalledWith("loja", true)
  })

  it("saves what was typed as the API takes it", async () => {
    render(<IntegrationsScreen slug="loja" result={null} locale="pt-BR" messages={ui} />)

    await userEvent.click(screen.getByRole("switch", { name: "SEDEX" }))
    await userEvent.clear(screen.getByLabelText("Dias para postar"))
    await userEvent.type(screen.getByLabelText("Dias para postar"), "3")
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))

    expect(mutate).toHaveBeenCalledWith({ handlingDays: 3, serviceIds: [1], defaultPackage: null }, expect.anything())
  })

  it("refuses a half parcel before sending anything, and says the API's refusal", async () => {
    with_({ saveError: new IntegrationError("MELHOR_ENVIO_SETTINGS_INVALID") })
    render(<IntegrationsScreen slug="loja" result={null} locale="pt-BR" messages={ui} />)

    await userEvent.type(screen.getByLabelText("Peso (g)"), "500")
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))

    expect(mutate).not.toHaveBeenCalled()
    expect(screen.getByLabelText("Peso (g)")).toHaveAccessibleDescription("Preencha o peso e as três medidas, ou deixe os quatro vazios.")
  })

  /** A shop that never chose offers every service: with their list unread, saving would offer none. */
  it("saves nothing for a shop that never chose while Melhor Envio's services could not be read", async () => {
    with_({ account: { isPending: false, isError: true, data: undefined } })
    render(<IntegrationsScreen slug="loja" result={null} locale="pt-BR" messages={ui} />)

    expect(screen.getByText("Não foi possível ler o saldo agora.")).toBeInTheDocument()
    expect(screen.getByText("Não foi possível ler a lista de serviços do Melhor Envio agora.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    expect(mutate).not.toHaveBeenCalled()
  })

  it("offers to connect a shop that has not, showing no settings, and says what came of the way back", () => {
    with_({ connection: { ...connected, status: "DISCONNECTED", account: null } })
    render(<IntegrationsScreen slug="lessari" result={{ tone: "failed", message: "O Melhor Envio recusou a autorização. Tente conectar de novo." }} locale="pt-BR" messages={ui} />)

    expect(screen.getByRole("link", { name: "Conectar Melhor Envio" })).toHaveAttribute("href", "/api/stores/lessari/integrations/melhor-envio/connect")
    expect(screen.queryByRole("button", { name: "Salvar" })).toBeNull()
    expect(screen.getAllByRole("alert").map((alert) => alert.textContent)).toContain("O Melhor Envio recusou a autorização. Tente conectar de novo.")
    expect(mocks.account).toHaveBeenCalledWith("lessari", false)
  })

  it("disconnects once confirmed", async () => {
    render(<IntegrationsScreen slug="loja" result={null} locale="pt-BR" messages={ui} />)

    await userEvent.click(screen.getByRole("button", { name: "Desconectar" }))
    await userEvent.click(screen.getAllByRole("button", { name: "Desconectar" }).at(-1)!)

    expect(disconnect).toHaveBeenCalledOnce()
  })

  it("holds its place as a skeleton while read, and offers to read again when that failed", async () => {
    mocks.connection.mockReturnValue({ isPending: true, isError: false })
    const { container, unmount } = render(<IntegrationsScreen slug="loja" result={null} locale="pt-BR" messages={ui} />)
    expect(container.querySelector("[aria-hidden='true']")).not.toBeNull()
    unmount()

    const refetch = vi.fn()
    mocks.connection.mockReturnValue({ isPending: false, isError: true, refetch })
    render(<IntegrationsScreen slug="loja" result={null} locale="pt-BR" messages={ui} />)
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }))
    expect(refetch).toHaveBeenCalledOnce()
  })
})
