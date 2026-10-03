// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { DeliverySettings, MelhorEnvioConnection, Store } from "@harness-monorepo/contracts"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { DeliveryError } from "@/services/delivery/delivery-requests"
import { StoreDeliveryTab } from "./store-delivery-tab"

const mocks = vi.hoisted(() => ({ settings: vi.fn(), save: vi.fn(), connection: vi.fn() }))
vi.mock("@/services/delivery/delivery-hooks", () => ({ useDeliverySettings: mocks.settings, useSaveDeliverySettings: mocks.save }))
vi.mock("@/services/integrations/integration-hooks", () => ({ useMelhorEnvioConnection: mocks.connection }))

const STORE = {
  slug: "lessari",
  address: { street: "Rua Augusta", number: "1500", complement: null, neighborhood: "Consolação", city: "São Paulo", state: "SP", zipCode: "01310930" },
  latitude: null,
  longitude: null,
} as unknown as Store

const defaults: DeliverySettings = { pickupEnabled: true, ownDeliveryEnabled: true, bands: [], radiusMeters: null, freeAboveCents: null, carriersEnabled: false, updatedAt: null }
const disconnected: MelhorEnvioConnection = { available: true, environment: "SANDBOX", status: "DISCONNECTED", account: null, connectedAt: null, accessExpiresAt: null }
const mutate = vi.fn()

function with_(state: { settings?: object; connection?: object; saveError?: Error | null }) {
  mocks.settings.mockReturnValue(state.settings ?? { isPending: false, isError: false, data: defaults })
  mocks.connection.mockReturnValue(state.connection ?? { isPending: false, isError: false, data: disconnected })
  mocks.save.mockReturnValue({ mutate, reset: vi.fn(), isPending: false, error: state.saveError ?? null, isSuccess: false })
}

beforeEach(() => {
  mutate.mockReset()
  with_({})
})

describe("StoreDeliveryTab (BEELINK-177)", () => {
  it("starts from today's checkout — pickup and own delivery on, no band, no carrier — with the pickup address", () => {
    render(<StoreDeliveryTab store={STORE} locale="pt-BR" messages={ui} />)

    expect(screen.getByRole("switch", { name: "Retirada na loja" })).toBeChecked()
    expect(screen.getByRole("switch", { name: "Entrega própria" })).toBeChecked()
    expect(screen.getByRole("switch", { name: "Transportadoras (Melhor Envio)" })).not.toBeChecked()
    expect(screen.getByText("Endereço de retirada: Rua Augusta, 1500 — Consolação, São Paulo/SP")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Conectar Melhor Envio" })).toHaveAttribute("href", "/api/stores/lessari/integrations/melhor-envio/connect")
  })

  it("saves a band typed in kilometres and reais as metres and cents, and says it in words first", async () => {
    render(<StoreDeliveryTab store={STORE} locale="pt-BR" messages={ui} />)

    await userEvent.click(screen.getByRole("button", { name: "Adicionar faixa" }))
    await userEvent.type(screen.getByLabelText("Até (km)"), "3,5")
    await userEvent.type(screen.getByLabelText("Frete (R$)"), "7,50")
    await userEvent.type(screen.getByLabelText("Chega de (min)"), "30")
    await userEvent.type(screen.getByLabelText("Até (min)"), "60")
    expect(screen.getByText(/Até 3,5 km: R\$\s7,50, chega em 30–60 min\./)).toBeInTheDocument()

    await userEvent.click(screen.getByRole("switch", { name: "Retirada na loja" }))
    await userEvent.click(screen.getByRole("button", { name: "Salvar entrega" }))

    expect(mutate).toHaveBeenCalledWith(
      { pickupEnabled: false, ownDeliveryEnabled: true, carriersEnabled: false, bands: [{ upToMeters: 3500, feeCents: 750, windowFromMinutes: 30, windowToMinutes: 60 }], freeAboveCents: null },
      expect.anything(),
    )
  })

  it("refuses a half-typed band before sending anything, and says the API's refusal", async () => {
    with_({ saveError: new DeliveryError("DELIVERY_SETTINGS_INVALID") })
    render(<StoreDeliveryTab store={STORE} locale="pt-BR" messages={ui} />)

    expect(screen.getByText("Alguma regra está fora do permitido. Confira as faixas.")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Adicionar faixa" }))
    await userEvent.type(screen.getByLabelText("Até (km)"), "3")
    await userEvent.click(screen.getByRole("button", { name: "Salvar entrega" }))

    expect(mutate).not.toHaveBeenCalled()
    expect(screen.getByText("Faixa 1: preencha a distância, o frete e os dois tempos.")).toBeInTheDocument()
  })

  it("waits for the rules and the connection as a skeleton, and says a failed read", () => {
    with_({ settings: { isPending: true, isError: false } })
    const { rerender } = render(<StoreDeliveryTab store={STORE} locale="pt-BR" messages={ui} />)
    expect(screen.getByRole("status")).toHaveTextContent("Carregando as regras de entrega")

    with_({ connection: { isPending: false, isError: true, refetch: vi.fn() }, settings: { isPending: false, isError: false, data: defaults, refetch: vi.fn() } })
    rerender(<StoreDeliveryTab store={STORE} locale="pt-BR" messages={ui} />)
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar as regras de entrega.")
  })
})
