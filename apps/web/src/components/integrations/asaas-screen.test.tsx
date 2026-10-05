// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { AsaasConnection, AsaasSettings } from "@harness-monorepo/contracts"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { IntegrationError } from "@/services/integrations/integration-requests"
import { AsaasScreen } from "./asaas-screen"

const mocks = vi.hoisted(() => ({ connection: vi.fn(), connect: vi.fn(), disconnect: vi.fn(), settings: vi.fn(), save: vi.fn() }))
vi.mock("@/services/integrations/asaas-hooks", () => ({
  useAsaasConnection: mocks.connection,
  useConnectAsaas: mocks.connect,
  useDisconnectAsaas: mocks.disconnect,
  useAsaasSettings: mocks.settings,
  useSaveAsaasSettings: mocks.save,
}))

/** Typed by the tests, and nobody's key. */
const TYPED = "$aact_hmlg_chave-de-teste"

const never: AsaasConnection = { available: true, environment: "SANDBOX", status: "DISCONNECTED", account: null, webhook: null, connectedAt: null }
const connected: AsaasConnection = { ...never, status: "CONNECTED", account: { name: "Loja Teste LTDA", document: "**.222.333/0001-**" }, webhook: "SKIPPED", connectedAt: "2026-10-05T12:00:00.000Z" }
const defaults: AsaasSettings = { pix: true, card: true, maxInstallments: 1, offline: true, updatedAt: null }

const connect = vi.fn()
const forget = vi.fn()
const disconnect = vi.fn()
const resetDisconnect = vi.fn()
const save = vi.fn()
const resetSave = vi.fn()

interface State {
  connection?: AsaasConnection
  connecting?: boolean
  refusal?: string | null
  justConnected?: boolean
  settings?: object
  saveError?: Error | null
  saved?: boolean
  disconnectFailed?: boolean
}

function with_(state: State) {
  mocks.connection.mockReturnValue({ isPending: false, isError: false, data: state.connection ?? connected })
  mocks.connect.mockReturnValue({ connect, isPending: state.connecting ?? false, refusal: state.refusal ?? null, connected: state.justConnected ?? false, forget })
  mocks.disconnect.mockReturnValue({ mutate: disconnect, reset: resetDisconnect, isPending: false, isError: state.disconnectFailed ?? false })
  mocks.settings.mockReturnValue(state.settings ?? { isPending: false, isError: false, data: defaults })
  mocks.save.mockReturnValue({ mutate: save, reset: resetSave, isPending: false, error: state.saveError ?? null, isSuccess: state.saved ?? false })
}

const view = (slug = "loja") => render(<AsaasScreen slug={slug} messages={ui} />)

beforeEach(() => {
  for (const mock of [connect, forget, disconnect, resetDisconnect, save, resetSave, mocks.settings]) mock.mockReset()
  with_({})
})

describe("AsaasScreen (BEELINK-203), connected", () => {
  it("shows whose account is connected, as the page's title, and the ways the shop is paid as they stand", () => {
    view()

    // Its own page: the card is the title, under the way back to the list.
    expect(screen.getByRole("heading", { level: 1, name: "Asaas" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Integrações" })).toHaveAttribute("href", "/admin/loja/integrations")
    expect(screen.getByText("Conta").nextElementSibling).toHaveTextContent("Loja Teste LTDA**.222.333/0001-**")
    expect(screen.getByText("Avisos de pagamento").nextElementSibling).toHaveTextContent("Não cadastrados neste ambiente")
    expect(screen.getByText("Sandbox")).toBeInTheDocument()

    // A shop that never saved: Pix and card in full, and paying on delivery.
    for (const way of ["Pix", "Cartão de crédito", "Pagar na entrega ou na retirada"]) expect(screen.getByRole("switch", { name: way })).toBeChecked()
    expect(screen.getByRole("combobox", { name: "Parcelas sem juros" })).toHaveTextContent("Só à vista (1x)")
    expect(mocks.settings).toHaveBeenCalledWith("loja")
    expect(screen.queryByRole("status")).toBeNull()
  })

  it("saves the ways of paying as the API takes them", async () => {
    view()

    await userEvent.click(screen.getByRole("switch", { name: "Pagar na entrega ou na retirada" }))
    await userEvent.click(screen.getByRole("combobox", { name: "Parcelas sem juros" }))
    await userEvent.click(await screen.findByRole("option", { name: "Até 6x" }))
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))

    expect(save).toHaveBeenCalledExactlyOnceWith({ pix: true, card: true, maxInstallments: 6, offline: false }, expect.anything())
  })

  /** With every way off the shop could not be paid at all: said at once, and the API is not asked. */
  it("says that one way has to stay on as soon as the last is switched off, and sends nothing", async () => {
    view()

    for (const way of ["Pix", "Cartão de crédito"]) await userEvent.click(screen.getByRole("switch", { name: way }))
    expect(screen.queryByRole("alert")).toBeNull()
    await userEvent.click(screen.getByRole("switch", { name: "Pagar na entrega ou na retirada" }))
    expect(screen.getByRole("alert")).toHaveTextContent("Deixe pelo menos uma forma ligada: sem nenhuma, o cliente não tem como pagar.")

    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    expect(save).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole("switch", { name: "Pix" }))
    expect(screen.queryByRole("alert")).toBeNull()
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    expect(save).toHaveBeenCalledExactlyOnceWith({ pix: true, card: false, maxInstallments: 1, offline: false }, expect.anything())
  })

  it("says it saved, says the API's refusal in words, and takes either back as a choice changes", async () => {
    with_({ saved: true })
    const { unmount } = view()
    expect(screen.getByText("Formas de pagamento salvas.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("switch", { name: "Pix" }))
    expect(resetSave).toHaveBeenCalledOnce()
    unmount()

    with_({ saveError: new IntegrationError("ASAAS_SETTINGS_INVALID") })
    view()
    expect(screen.getByRole("alert")).toHaveTextContent("Alguma escolha está fora do permitido. Confira as formas e o número de parcelas.")
  })

  it("holds the ways of paying as grey shapes while they are read, and offers to read them again when that failed", async () => {
    with_({ settings: { isPending: true, isError: false } })
    const { unmount } = view()
    expect(screen.getByRole("status")).toHaveTextContent("Carregando as formas de pagamento…")
    expect(screen.queryByRole("switch")).toBeNull()
    // The account is on the page all the while: only the choices are missing.
    expect(screen.getByText("Conta").nextElementSibling).toHaveTextContent("Loja Teste LTDA")
    unmount()

    const refetch = vi.fn()
    with_({ settings: { isPending: false, isError: true, refetch } })
    view()
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar as formas de pagamento.")
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  it("replaces the key with the field of a secret, through the same way a first key goes", async () => {
    view()

    await userEvent.click(screen.getByRole("button", { name: "Trocar a chave" }))
    const field = screen.getByLabelText("Nova chave de API")
    expect(field).toHaveAttribute("type", "password")
    await userEvent.type(field, TYPED)
    await userEvent.click(screen.getByRole("button", { name: "Conectar com a nova chave" }))

    expect(connect).toHaveBeenCalledExactlyOnceWith(TYPED)
  })

  it("disconnects once confirmed, and takes back that it had just connected", async () => {
    with_({ justConnected: true })
    view()
    expect(screen.getByRole("status")).toHaveTextContent("Asaas conectado. Escolha abaixo as formas de pagamento da loja.")

    await userEvent.click(screen.getByRole("button", { name: "Desconectar" }))
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Desconectar" }))

    expect(disconnect).toHaveBeenCalledOnce()
    const [, { onSuccess }] = disconnect.mock.calls[0] as [undefined, { onSuccess: () => void }]
    onSuccess()
    expect(forget).toHaveBeenCalledOnce()
  })

  it("says when the disconnect did not go through, until another key is tried", async () => {
    with_({ disconnectFailed: true })
    view()
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível desconectar agora. Tente de novo.")

    await userEvent.click(screen.getByRole("button", { name: "Trocar a chave" }))
    await userEvent.type(screen.getByLabelText("Nova chave de API"), TYPED)
    await userEvent.click(screen.getByRole("button", { name: "Conectar com a nova chave" }))

    expect(resetDisconnect).toHaveBeenCalledOnce()
    expect(connect).toHaveBeenCalledExactlyOnceWith(TYPED)
  })

  /** A refusal belongs to the try it answered: left behind, it would greet the next, empty form. */
  it("forgets a refusal said in a replacement that was left without sending, and only then", async () => {
    with_({ refusal: "INTEGRATION_UNREACHABLE" })
    const { unmount } = view()
    await userEvent.click(screen.getByRole("button", { name: "Trocar a chave" }))
    expect(screen.getByRole("alert")).toHaveTextContent("O Asaas não respondeu. Tente de novo em instantes.")
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(forget).toHaveBeenCalledOnce()
    unmount()

    // Nothing was refused: leaving the form takes nothing back — not that the shop had just connected.
    with_({ justConnected: true })
    view()
    await userEvent.click(screen.getByRole("button", { name: "Trocar a chave" }))
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(forget).toHaveBeenCalledOnce()
    expect(screen.getByRole("status")).toHaveTextContent("Asaas conectado.")
  })
})

describe("AsaasScreen (BEELINK-203), yet to connect", () => {
  it("takes the key and hands it to the connection, showing no ways of paying and asking for none", async () => {
    with_({ connection: never })
    view("lessari")

    expect(screen.getByRole("heading", { level: 1, name: "Asaas" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Criar conta no Asaas/ })).toHaveAttribute("href", "https://sandbox.asaas.com")
    await userEvent.type(screen.getByLabelText("Chave de API"), TYPED)
    await userEvent.click(screen.getByRole("button", { name: "Conectar" }))

    expect(connect).toHaveBeenCalledExactlyOnceWith(TYPED)
    expect(mocks.connect).toHaveBeenCalledWith("lessari")
    expect(screen.queryByRole("switch")).toBeNull()
    expect(mocks.settings).not.toHaveBeenCalled()
  })

  it("sends a production shopkeeper with no account to Asaas's own site", () => {
    with_({ connection: { ...never, environment: "PRODUCTION" } })
    view()

    expect(screen.getByRole("link", { name: /Criar conta no Asaas/ })).toHaveAttribute("href", "https://www.asaas.com")
    expect(screen.queryByText("Sandbox")).toBeNull()
  })

  it("locks the key while Asaas is asked", () => {
    with_({ connection: never, connecting: true })
    view()

    expect(screen.getByLabelText("Chave de API")).toBeDisabled()
    expect(screen.getByRole("button", { name: "Conectando…" })).toBeDisabled()
  })

  it.each([
    ["INTEGRATION_KEY_INVALID", "SANDBOX", "O Asaas não aceitou essa chave. Copie a chave de novo, inteira, e cole aqui."],
    ["INTEGRATION_KEY_WRONG_ENVIRONMENT", "SANDBOX", "Essa chave não é do ambiente de testes. Esta instalação só aceita chaves do sandbox do Asaas, que começam com $aact_hmlg_."],
    ["INTEGRATION_KEY_WRONG_ENVIRONMENT", "PRODUCTION", "Essa chave não é de produção. Esta instalação só aceita chaves de produção do Asaas, que começam com $aact_prod_."],
    ["INTEGRATION_UNREACHABLE", "SANDBOX", "O Asaas não respondeu. Tente de novo em instantes."],
    ["RATE_LIMITED", "SANDBOX", "Muitas tentativas. Espere um minuto e tente de novo."],
    ["INTEGRATION_UNAVAILABLE", "SANDBOX", "Algo deu errado ao conectar. Tente de novo."],
    ["SOMETHING_NEW", "SANDBOX", "Algo deu errado ao conectar. Tente de novo."],
  ] as const)("says %s on a %s installation in its own words, under the key", (refusal, environment, sentence) => {
    with_({ connection: { ...never, environment }, refusal })
    view()

    expect(screen.getByRole("alert")).toHaveTextContent(sentence)
    expect(screen.getByLabelText("Chave de API")).toHaveAccessibleDescription(new RegExp(`^${sentence.replace(/[$.()]/g, "\\$&")}`))
  })

  it("says this installation cannot seal a key, with nothing to type or press", () => {
    with_({ connection: { ...never, available: false } })
    view()

    expect(screen.getByText("O Asaas ainda não está configurado nesta instalação.")).toBeInTheDocument()
    expect(screen.queryByLabelText("Chave de API")).toBeNull()
    expect(screen.queryByRole("button")).toBeNull()
  })
})

describe("AsaasScreen (BEELINK-203), when Asaas stopped accepting the key", () => {
  it("warns, takes a key to connect again, and shows no ways of paying until it does", async () => {
    with_({ connection: { ...connected, status: "NEEDS_RECONNECT" } })
    view()

    expect(screen.getByRole("alert")).toHaveTextContent("O Asaas parou de aceitar a chave desta loja.")
    expect(screen.getByText("Conta").nextElementSibling).toHaveTextContent("Loja Teste LTDA")
    await userEvent.type(screen.getByLabelText("Chave de API"), TYPED)
    await userEvent.click(screen.getByRole("button", { name: "Conectar de novo" }))

    expect(connect).toHaveBeenCalledExactlyOnceWith(TYPED)
    expect(screen.queryByRole("switch")).toBeNull()
    expect(mocks.settings).not.toHaveBeenCalled()
  })
})

describe("AsaasScreen (BEELINK-203), while the connection is read", () => {
  it("holds its place as a skeleton, and offers to read again when that failed", async () => {
    mocks.connection.mockReturnValue({ isPending: true, isError: false })
    const { container, unmount } = view()
    expect(container.querySelector("[aria-hidden='true']")).not.toBeNull()
    // Titled for a reader before the card is there to title it.
    expect(screen.getByRole("heading", { level: 1, name: "Asaas" })).toBeInTheDocument()
    expect(screen.queryByLabelText("Chave de API")).toBeNull()
    unmount()

    const refetch = vi.fn()
    mocks.connection.mockReturnValue({ isPending: false, isError: true, refetch })
    view()
    expect(screen.getByRole("link", { name: "Integrações" })).toHaveAttribute("href", "/admin/loja/integrations")
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }))
    expect(refetch).toHaveBeenCalledOnce()
  })
})
