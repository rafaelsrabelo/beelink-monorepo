// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { MetaPixelConnection } from "@harness-monorepo/contracts"

// UI
import { en } from "@harness-monorepo/ui/locales/en"
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { IntegrationError } from "@/services/integrations/integration-requests"
import { MetaPixelScreen } from "./meta-pixel-screen"

const mocks = vi.hoisted(() => ({ connection: vi.fn(), save: vi.fn(), remove: vi.fn() }))
vi.mock("@/services/integrations/meta-pixel-hooks", () => ({
  useMetaPixelConnection: mocks.connection,
  useSaveMetaPixel: mocks.save,
  useRemoveMetaPixel: mocks.remove,
}))

/** IDs of the right shape, and nobody's pixel. */
const ID = "123456789012345"
const OTHER = "987654321098765"

const never: MetaPixelConnection = { status: "DISCONNECTED", pixelId: null, connectedAt: null }
const connected: MetaPixelConnection = { status: "CONNECTED", pixelId: ID, connectedAt: "2026-10-06T12:00:00.000Z" }

const save = vi.fn()
const resetSave = vi.fn()
const remove = vi.fn()
const resetRemove = vi.fn()

interface State {
  connection?: MetaPixelConnection
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

const view = (slug = "loja", messages = ui) => render(<MetaPixelScreen slug={slug} messages={messages} />)
const field = () => screen.getByLabelText<HTMLInputElement>("ID do pixel")

beforeEach(() => {
  for (const mock of [save, resetSave, remove, resetRemove]) mock.mockReset()
  with_({})
})

describe("MetaPixelScreen (BEELINK-270), for a shop yet to give its pixel", () => {
  it("is the pixel's own page: the way back to the list, the card as its title under Meta's mark, and not connected", () => {
    const { container } = view()

    expect(screen.getByRole("heading", { level: 1, name: "Pixel da Meta" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Integrações" })).toHaveAttribute("href", "/admin/loja/integrations")
    expect(container.querySelector("img")).toHaveAttribute("src", "/brand/integrations/meta-icon.svg")
    expect(screen.getByText("Não conectado")).toBeInTheDocument()
    expect(screen.queryByText("Conectado")).toBeNull()
    expect(mocks.connection).toHaveBeenCalledWith("loja")
    expect(screen.queryByRole("status")).toBeNull()
  })

  it("saves the ID typed, as the API takes it", async () => {
    view()

    await userEvent.type(field(), ID)
    await userEvent.click(screen.getByRole("button", { name: "Conectar" }))

    expect(save).toHaveBeenCalledExactlyOnceWith({ pixelId: ID })
  })

  it("forgives the white space an ID was pasted with, and sends the digits alone", async () => {
    view()

    await userEvent.click(field())
    await userEvent.paste(`  12345 67890 12345\n`)
    await userEvent.click(screen.getByRole("button", { name: "Conectar" }))

    expect(save).toHaveBeenCalledExactlyOnceWith({ pixelId: ID })
  })

  /** The API takes 10 to 20 digits and nothing else: what it would refuse is said at once, and it is not asked. */
  it.each([["too short", "12345"], ["a letter in it", "12345678901234a"], ["the pixel's code", `fbq('init', '${ID}');`]])("sends nothing of an ID that is %s, and says what an ID is", async (_what, typed) => {
    view()

    await userEvent.click(field())
    await userEvent.paste(typed)
    await userEvent.click(screen.getByRole("button", { name: "Conectar" }))

    expect(save).not.toHaveBeenCalled()
    expect(screen.getByRole("alert")).toHaveTextContent("Esse não parece um ID de pixel. O ID tem só números, de 10 a 20 dígitos")
  })

  it("says the API's own refusal of an ID as the same sentence, under the field", () => {
    with_({ saveError: new IntegrationError("META_PIXEL_ID_INVALID") })
    view()

    expect(screen.getByRole("alert")).toHaveTextContent(ui.integrations.metaPixel.errors.META_PIXEL_ID_INVALID)
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

describe("MetaPixelScreen, where to find the ID", () => {
  it("says the steps at Meta, in order, and leads to Events Manager in another tab", () => {
    view()

    const guide = within(screen.getByRole("region", { name: "Onde encontrar o ID do pixel" }))
    const steps = within(guide.getAllByRole("list")[0]!).getAllByRole("listitem").map((step) => step.textContent)
    expect(steps).toHaveLength(4)
    expect(steps[0]).toMatch(/Gerenciador de Eventos da Meta/)
    expect(steps[1]).toMatch(/Fontes de dados/)
    expect(steps[2]).toMatch(/pixel da sua loja.*conjunto de dados/)
    expect(steps[3]).toMatch(/Copie o ID/)
    const link = guide.getByRole("link", { name: "Abrir o Gerenciador de Eventos (abre em nova aba)" })
    expect(link).toHaveAttribute("href", "https://business.facebook.com/events_manager")
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
  })

  /** BEELINK-268: every shop shares one domain, and none could verify it at Meta — nor needs to. */
  it("says the domain needs no verifying at Meta, and that reports and ad creation stay at Meta", () => {
    view()

    expect(screen.getByText("Você não precisa verificar o domínio na Meta para usar o pixel na sua loja.")).toBeInTheDocument()
    expect(screen.getByText("Os relatórios e a criação dos anúncios continuam na Meta: o bee-link não mostra o resultado dos anúncios.")).toBeInTheDocument()
  })

  it("is there for a shop with an ID saved too: whoever changes it copies it from the same place", () => {
    with_({ connection: connected })
    view()

    expect(screen.getByRole("region", { name: "Onde encontrar o ID do pixel" })).toBeInTheDocument()
    expect(screen.getByText(/Os relatórios e a criação dos anúncios continuam na Meta/)).toBeInTheDocument()
  })

  /**
   * Until BEELINK-272 the ID was only saved, and nothing here could speak of sending. The shop
   * window now sends a visitor's path — after their yes, and not the purchase yet (X6). So the rule
   * is no longer silence: a sentence may speak of sending only beside the acceptance it depends on,
   * and none may say the shop is measuring or tracking as a standing fact.
   */
  it.each([["pt-BR", ui], ["en", en]] as const)("speaks of sending to Meta, in %s, only for visitors who accept — and never as measuring under way", (_name, messages) => {
    const sentences = (value: unknown): string[] => (typeof value === "string" ? [value] : Object.values(value as object).flatMap(sentences))
    const said = sentences(messages.integrations.metaPixel)
    const ofSending = said.filter((sentence) => /envia|enviad|\bsends?\b|\bsent\b|sending/i.test(sentence))

    expect(ofSending).toEqual([messages.integrations.metaPixel.guide.notes.events])
    for (const sentence of ofSending) expect(sentence).toMatch(/aceita|accept/i)
    expect(said.join(" ")).not.toMatch(/enviando|já envia|está medindo|já mede|is sending|being sent|is measuring|is tracking/i)
  })

  it.each([["pt-BR", ui, /compras ainda não são enviadas/i], ["en", en, /purchases are not sent yet/i]] as const)("says, in %s, that purchases are not sent yet", (_name, messages, notYet) => {
    expect(messages.integrations.metaPixel.guide.notes.events).toMatch(notYet)
  })

  it("loads nothing of Meta's: no script, no frame, and no image from another site", () => {
    with_({ connection: connected })
    const { container } = view()

    expect(container.querySelector("script, iframe, noscript")).toBeNull()
    for (const image of container.querySelectorAll("img")) expect(image.getAttribute("src")).toMatch(/^\/brand\//)
  })
})

describe("MetaPixelScreen, connected", () => {
  beforeEach(() => with_({ connection: connected }))

  it("is connected in green, and says which ID is saved and when", () => {
    view()

    expect(screen.getByText("Conectado")).toHaveAttribute("data-variant", "success")
    expect(screen.getByText("ID do pixel").nextElementSibling).toHaveTextContent(ID)
    expect(screen.getByText("Salvo em").nextElementSibling).toHaveTextContent("06/10/2026")
    expect(screen.queryByRole("textbox")).toBeNull()
    // Read as saved, not just saved: nothing is announced.
    expect(screen.queryByRole("status")).toBeNull()
  })

  it("says once, over the page, that the ID was saved there and then", () => {
    with_({ connection: connected, saved: true })
    view()

    expect(screen.getByRole("status")).toHaveTextContent("Pixel da Meta conectado: o ID foi salvo.")
  })

  it("changes the ID with the same field, and forgets a refusal when the change is left", async () => {
    with_({ connection: connected, saveError: new IntegrationError("META_PIXEL_ID_INVALID") })
    view()

    await userEvent.click(screen.getByRole("button", { name: "Trocar o ID" }))
    await userEvent.type(screen.getByLabelText("Novo ID do pixel"), OTHER)
    await userEvent.click(screen.getByRole("button", { name: "Salvar o novo ID" }))
    expect(save).toHaveBeenCalledExactlyOnceWith({ pixelId: OTHER })

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(resetSave).toHaveBeenCalledOnce()
  })

  it("asks before disconnecting, and removes the pixel only once it is confirmed", async () => {
    view()

    await userEvent.click(screen.getByRole("button", { name: "Desconectar" }))
    const dialog = await screen.findByRole("alertdialog", { name: "Desconectar o Pixel da Meta?" })
    expect(dialog).toHaveTextContent("Nada muda na sua conta da Meta")
    expect(remove).not.toHaveBeenCalled()

    await userEvent.click(within(dialog).getByRole("button", { name: "Desconectar" }))
    expect(remove).toHaveBeenCalledOnce()
  })

  it("keeps the pixel when the question is answered with keeping it", async () => {
    view()

    await userEvent.click(screen.getByRole("button", { name: "Desconectar" }))
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Manter conectado" }))

    expect(remove).not.toHaveBeenCalled()
  })

  /** "ID foi salvo" over a shop that has just taken its pixel away would be about nothing. */
  it("stops saying an ID was saved once the pixel is removed", async () => {
    with_({ connection: connected, saved: true })
    const { unmount } = view()
    await userEvent.click(screen.getByRole("button", { name: "Desconectar" }))
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Desconectar" }))
    const [, options] = remove.mock.calls[0] as [undefined, { onSuccess: () => void }]
    options.onSuccess()
    expect(resetSave).toHaveBeenCalledOnce()
    unmount()

    // And while the reset is on its way, a shop read as having no pixel is told nothing was saved.
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

describe("MetaPixelScreen, before the connection is read", () => {
  it("holds the page's place with grey shapes — never a spinner or a word — and still says which page it is", () => {
    mocks.connection.mockReturnValue({ isPending: true, isError: false })
    const { container } = view()

    expect(screen.getByRole("heading", { level: 1, name: "Pixel da Meta" })).toBeInTheDocument()
    expect(container.querySelectorAll("[data-slot='skeleton']").length).toBeGreaterThan(0)
    expect(screen.queryByText(/carregando/i)).toBeNull()
    expect(screen.queryByRole("textbox")).toBeNull()
    expect(screen.queryByText("Não conectado")).toBeNull()
  })

  /** A read that failed is not a shop with no pixel: it may well have one. */
  it("says a read that failed, never as a shop with no pixel, and reads again when asked", async () => {
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
