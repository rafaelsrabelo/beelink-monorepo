// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { GoogleAnalyticsConnection } from "@harness-monorepo/contracts"

// UI
import { en } from "@harness-monorepo/ui/locales/en"
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { IntegrationError } from "@/services/integrations/integration-requests"
import { GoogleAnalyticsScreen } from "./google-analytics-screen"

const mocks = vi.hoisted(() => ({ connection: vi.fn(), save: vi.fn(), remove: vi.fn() }))
vi.mock("@/services/integrations/google-analytics-hooks", () => ({
  useGoogleAnalyticsConnection: mocks.connection,
  useSaveGoogleAnalytics: mocks.save,
  useRemoveGoogleAnalytics: mocks.remove,
}))

/** IDs of the right shape, and nobody's property. */
const ID = "G-AB12CD34EF"
const OTHER = "G-ZY98XW76VU"

const never: GoogleAnalyticsConnection = { status: "DISCONNECTED", measurementId: null, connectedAt: null }
const connected: GoogleAnalyticsConnection = { status: "CONNECTED", measurementId: ID, connectedAt: "2026-10-07T12:00:00.000Z" }

const save = vi.fn()
const resetSave = vi.fn()
const remove = vi.fn()
const resetRemove = vi.fn()

interface State {
  connection?: GoogleAnalyticsConnection
  saving?: boolean
  saved?: boolean
  saveError?: Error | null
  removing?: boolean
  removeFailed?: boolean
}

function with_(state: State) {
  mocks.connection.mockReturnValue({ isPending: false, isError: false, data: state.connection ?? never })
  mocks.save.mockReturnValue({ mutate: save, reset: resetSave, isPending: state.saving ?? false, isSuccess: state.saved ?? false, isError: Boolean(state.saveError), error: state.saveError ?? null })
  mocks.remove.mockReturnValue({ mutate: remove, reset: resetRemove, isPending: state.removing ?? false, isError: state.removeFailed ?? false })
}

const view = (slug = "loja", messages = ui) => render(<GoogleAnalyticsScreen slug={slug} messages={messages} />)
const field = () => screen.getByLabelText<HTMLInputElement>("ID de medição")

beforeEach(() => {
  for (const mock of [save, resetSave, remove, resetRemove]) mock.mockReset()
  with_({})
})

describe("GoogleAnalyticsScreen (BEELINK-302), for a shop yet to give its ID", () => {
  it("is the integration's own page: the way back to the list, the card as its title under Google Analytics' mark, and not connected", () => {
    const { container } = view()

    expect(screen.getByRole("heading", { level: 1, name: "Google Analytics" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Integrações" })).toHaveAttribute("href", "/admin/loja/integrations")
    expect(container.querySelector("img")).toHaveAttribute("src", "/brand/integrations/google-analytics-icon.svg")
    expect(screen.getByText("Não conectado")).toBeInTheDocument()
    expect(screen.queryByText("Conectado")).toBeNull()
    expect(mocks.connection).toHaveBeenCalledWith("loja")
    expect(screen.queryByRole("status")).toBeNull()
  })

  it("saves the ID typed, as the API takes it", async () => {
    view()

    await userEvent.type(field(), ID)
    await userEvent.click(screen.getByRole("button", { name: "Conectar" }))

    expect(save).toHaveBeenCalledExactlyOnceWith({ measurementId: ID })
  })

  it("forgives the white space an ID was pasted with, and sends the ID alone", async () => {
    view()

    await userEvent.click(field())
    await userEvent.paste(`  G-AB12 CD34EF\n`)
    await userEvent.click(screen.getByRole("button", { name: "Conectar" }))

    expect(save).toHaveBeenCalledExactlyOnceWith({ measurementId: ID })
  })

  /** The API takes `G-` and capitals or digits, and nothing else: what it would refuse is said at once, and it is not asked. */
  it.each([
    ["a Universal Analytics code", "UA-12345678-1"],
    ["a Tag Manager container", "GTM-AB12CD3"],
    ["a Google Ads code", "AW-1234567890"],
    ["in small letters", "g-ab12cd34ef"],
    ["the tag's code", `gtag('config', '${ID}');`],
  ])("sends nothing of an ID that is %s, and says clearly what an ID is and what does not serve", async (_what, typed) => {
    view()

    await userEvent.click(field())
    await userEvent.paste(typed)
    await userEvent.click(screen.getByRole("button", { name: "Conectar" }))

    expect(save).not.toHaveBeenCalled()
    expect(screen.getByRole("alert")).toHaveTextContent("Esse não parece um ID de medição. Ele começa com G-, seguido de letras maiúsculas e números, como G-AB12CD34EF. Os códigos que começam com UA-, GTM- ou AW- são de outros produtos do Google e não servem aqui.")
  })

  it("says the API's own refusal of an ID as the same sentence, under the field", () => {
    with_({ saveError: new IntegrationError("GOOGLE_ANALYTICS_ID_INVALID") })
    view()

    expect(screen.getByRole("alert")).toHaveTextContent(ui.integrations.googleAnalytics.errors.GOOGLE_ANALYTICS_ID_INVALID)
    expect(field()).toHaveAttribute("aria-invalid", "true")
  })

  it.each([["a code it has no sentence for", new IntegrationError("STORE_FORBIDDEN")], ["no answer of the API's", new TypeError("Failed to fetch")]])("says a save that did not go through, for %s", (_what, saveError) => {
    with_({ saveError })
    view()

    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível salvar o ID agora. Tente de novo.")
  })

  it("locks the field while the ID is saved", () => {
    with_({ saving: true })
    view()

    expect(field()).toBeDisabled()
    expect(screen.getByRole("button", { name: "Conectando…" })).toBeDisabled()
  })
})

describe("GoogleAnalyticsScreen, where to find the ID and where the reports are", () => {
  it("says the steps at Google Analytics, in order, and leads there in another tab", () => {
    view()

    const guide = within(screen.getByRole("region", { name: "Onde encontrar o ID de medição" }))
    const steps = within(guide.getAllByRole("list")[0]!).getAllByRole("listitem").map((step) => step.textContent)
    expect(steps).toHaveLength(5)
    expect(steps[0]).toMatch(/Abra o Google Analytics/)
    expect(steps[1]).toMatch(/Administrador/)
    expect(steps[2]).toMatch(/Fluxos de dados/)
    expect(steps[3]).toMatch(/fluxo da Web/)
    expect(steps[4]).toMatch(/copie o ID de métricas, que começa com G-/)
    const link = guide.getByRole("link", { name: "Abrir o Google Analytics (abre em nova aba)" })
    expect(link).toHaveAttribute("href", "https://analytics.google.com/")
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
  })

  it.each([["with no ID saved", never], ["with an ID saved", connected]])("says the reports stay at Google Analytics, with the link there, %s", (_what, connection) => {
    with_({ connection })
    view()

    const reports = within(screen.getByRole("region", { name: "Os relatórios ficam no Google Analytics" }))
    expect(reports.getByText(/O bee-link não mostra os números do Google Analytics\./)).toBeInTheDocument()
    const link = reports.getByRole("link", { name: "Ver os relatórios no Google Analytics (abre em nova aba)" })
    expect(link).toHaveAttribute("href", "https://analytics.google.com/")
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
    expect(screen.getByRole("region", { name: "Onde encontrar o ID de medição" })).toBeInTheDocument()
  })

  /**
   * After this ticket the ID is only saved: the shop window uses it from BEELINK-303 on. So no
   * sentence here may say that anything is sent or measured — the ticket that sends adds its own.
   */
  it.each([["pt-BR", ui], ["en", en]] as const)("promises, in %s, nothing sent to Google and no measuring under way", (_name, messages) => {
    const sentences = (value: unknown): string[] => (typeof value === "string" ? [value] : Object.values(value as object).flatMap(sentences))
    const said = sentences(messages.integrations.googleAnalytics).join(" ")

    expect(said).not.toMatch(/envia|enviad|\bsends?\b|\bsent\b|sending|está medindo|já mede|is measuring|is tracking/i)
  })

  it("loads nothing of Google's: no script, no frame, and no image from another site", () => {
    with_({ connection: connected })
    const { container } = view()

    expect(container.querySelector("script, iframe, noscript")).toBeNull()
    for (const image of container.querySelectorAll("img")) expect(image.getAttribute("src")).toMatch(/^\/brand\//)
  })
})

describe("GoogleAnalyticsScreen, connected", () => {
  beforeEach(() => with_({ connection: connected }))

  it("is connected in green, and says which ID is saved and when", () => {
    view()

    expect(screen.getByText("Conectado")).toHaveAttribute("data-variant", "success")
    expect(screen.getByText("ID de medição").nextElementSibling).toHaveTextContent(ID)
    expect(screen.getByText("Salvo em").nextElementSibling).toHaveTextContent("07/10/2026")
    expect(screen.queryByRole("textbox")).toBeNull()
    // Read as saved, not just saved: nothing is announced.
    expect(screen.queryByRole("status")).toBeNull()
  })

  it("says once, over the page, that the ID was saved there and then", () => {
    with_({ connection: connected, saved: true })
    view()

    expect(screen.getByRole("status")).toHaveTextContent("Google Analytics conectado: o ID foi salvo.")
  })

  it("changes the ID with the same field, and forgets a refusal when the change is left", async () => {
    with_({ connection: connected, saveError: new IntegrationError("GOOGLE_ANALYTICS_ID_INVALID") })
    view()

    await userEvent.click(screen.getByRole("button", { name: "Trocar o ID" }))
    await userEvent.type(screen.getByLabelText("Novo ID de medição"), OTHER)
    await userEvent.click(screen.getByRole("button", { name: "Salvar o novo ID" }))
    expect(save).toHaveBeenCalledExactlyOnceWith({ measurementId: OTHER })

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(resetSave).toHaveBeenCalledOnce()
  })

  it("asks before disconnecting, and removes the ID only once it is confirmed", async () => {
    view()

    await userEvent.click(screen.getByRole("button", { name: "Desconectar" }))
    const dialog = await screen.findByRole("alertdialog", { name: "Desconectar o Google Analytics?" })
    expect(dialog).toHaveTextContent("Nada muda na sua conta do Google Analytics")
    expect(remove).not.toHaveBeenCalled()

    await userEvent.click(within(dialog).getByRole("button", { name: "Desconectar" }))
    expect(remove).toHaveBeenCalledOnce()
  })

  it("keeps the ID when the question is answered with keeping it", async () => {
    view()

    await userEvent.click(screen.getByRole("button", { name: "Desconectar" }))
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Manter conectado" }))

    expect(remove).not.toHaveBeenCalled()
  })

  /** "ID foi salvo" over a shop that has just taken its ID away would be about nothing. */
  it("stops saying an ID was saved once it is removed", async () => {
    with_({ connection: connected, saved: true })
    const { unmount } = view()
    await userEvent.click(screen.getByRole("button", { name: "Desconectar" }))
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Desconectar" }))
    const [, options] = remove.mock.calls[0] as [undefined, { onSuccess: () => void }]
    options.onSuccess()
    expect(resetSave).toHaveBeenCalledOnce()
    unmount()

    // And while the reset is on its way, a shop read as having no ID is told nothing was saved.
    with_({ connection: never, saved: true })
    view()
    expect(screen.queryByRole("status")).toBeNull()
  })

  it("says a disconnect that did not go through, and locks the ways out while one is on its way", () => {
    with_({ connection: connected, removeFailed: true })
    const { unmount } = view()
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível desconectar agora. Tente de novo.")
    unmount()

    with_({ connection: connected, removing: true })
    view()
    expect(screen.getByRole("button", { name: "Desconectar" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Trocar o ID" })).toBeDisabled()
  })
})

describe("GoogleAnalyticsScreen, before the connection is read", () => {
  it("holds the page's place with grey shapes — never a spinner or a word — and still says which page it is", () => {
    mocks.connection.mockReturnValue({ isPending: true, isError: false })
    const { container } = view()

    expect(screen.getByRole("heading", { level: 1, name: "Google Analytics" })).toBeInTheDocument()
    expect(container.querySelectorAll("[data-slot='skeleton']").length).toBeGreaterThan(0)
    expect(screen.queryByText(/carregando/i)).toBeNull()
    expect(screen.queryByRole("textbox")).toBeNull()
    expect(screen.queryByText("Não conectado")).toBeNull()
  })

  /** A read that failed is not a shop with no ID: it may well have one. */
  it("says a read that failed, never as a shop with no ID, and reads again when asked", async () => {
    const refetch = vi.fn()
    mocks.connection.mockReturnValue({ isPending: false, isError: true, refetch })
    view()

    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar as integrações.")
    expect(screen.queryByText("Não conectado")).toBeNull()
    expect(screen.queryByRole("textbox")).toBeNull()
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }))
    expect(refetch).toHaveBeenCalledOnce()
  })
})
