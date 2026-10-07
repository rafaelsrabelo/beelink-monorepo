// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { MetaPixelConnection, MetaPixelTestEventResult } from "@harness-monorepo/contracts"

// UI
import { en } from "@harness-monorepo/ui/locales/en"
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { IntegrationError } from "@/services/integrations/integration-requests"
import { MetaPixelScreen } from "./meta-pixel-screen"

const mocks = vi.hoisted(() => ({ connection: vi.fn(), save: vi.fn(), remove: vi.fn(), token: vi.fn(), removeToken: vi.fn(), test: vi.fn() }))
vi.mock("@/services/integrations/meta-pixel-hooks", () => ({
  useMetaPixelConnection: mocks.connection,
  useSaveMetaPixel: mocks.save,
  useRemoveMetaPixel: mocks.remove,
  useSaveMetaPixelToken: mocks.token,
  useRemoveMetaPixelToken: mocks.removeToken,
  useSendMetaPixelTestEvent: mocks.test,
}))

/** IDs of the right shape, and nobody's pixel. */
const ID = "123456789012345"
const OTHER = "987654321098765"

const never: MetaPixelConnection = { status: "DISCONNECTED", pixelId: null, connectedAt: null, conversions: { available: true, token: "NONE", refusal: null, refusedAt: null } }
const connected: MetaPixelConnection = { status: "CONNECTED", pixelId: ID, connectedAt: "2026-10-06T12:00:00.000Z", conversions: { available: true, token: "NONE", refusal: null, refusedAt: null } }

const save = vi.fn()
const resetSave = vi.fn()
const remove = vi.fn()
const resetRemove = vi.fn()
const saveToken = vi.fn()
const forgetToken = vi.fn()
const removeToken = vi.fn()
const resetRemoveToken = vi.fn()
const sendTest = vi.fn()
const resetTest = vi.fn()

interface State {
  tokenSaving?: boolean
  tokenRefusal?: string | null
  tokensSaved?: number
  tokenRemoved?: boolean
  tokenRemoveFailed?: boolean
  testing?: boolean
  tested?: MetaPixelTestEventResult
  testError?: Error | null
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
  mocks.token.mockReturnValue({ save: saveToken, forget: forgetToken, isPending: state.tokenSaving ?? false, refusal: state.tokenRefusal ?? null, savedCount: state.tokensSaved ?? 0 })
  mocks.removeToken.mockReturnValue({ mutate: removeToken, reset: resetRemoveToken, isPending: false, isSuccess: state.tokenRemoved ?? false, isError: state.tokenRemoveFailed ?? false })
  mocks.test.mockReturnValue({ mutate: sendTest, reset: resetTest, isPending: state.testing ?? false, isSuccess: Boolean(state.tested), data: state.tested, isError: Boolean(state.testError), error: state.testError ?? null })
}

const view = (slug = "loja", messages = ui) => render(<MetaPixelScreen slug={slug} messages={messages} />)
const field = () => screen.getByLabelText<HTMLInputElement>("ID do pixel")

beforeEach(() => {
  for (const mock of [save, resetSave, remove, resetRemove, saveToken, forgetToken, removeToken, resetRemoveToken, sendTest, resetTest]) mock.mockReset()
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

  // BEELINK-273: the purchase is sent now, and the shopkeeper is told which moment counts as one at each kind of shop.
  it.each([
    ["pt-BR", ui, /pedido feito, quando o pagamento é combinado com você/i, /pagamento aprovado, quando é cobrado no site/i],
    ["en", en, /order placed, when payment is settled with you/i, /payment approved, when it is charged on the site/i],
  ] as const)("says, in %s, what counts as a purchase — and no longer that purchases are not sent", (_name, messages, settled, charged) => {
    const events = messages.integrations.metaPixel.guide.notes.events

    expect(events).toMatch(settled)
    expect(events).toMatch(charged)
    expect(events).not.toMatch(/ainda não|not sent yet/i)
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

describe("MetaPixelScreen, the purchases told from the server (BEELINK-274)", () => {
  /** The shape of a token, and nobody's. */
  const TOKEN = "EAABnobodys0token0000000000000000000000"
  const withToken = (token: "NONE" | "SET" | "REJECTED", refusal: "TOKEN_REJECTED" | "PIXEL_NOT_FOUND" | null = null, available = true): MetaPixelConnection => ({
    ...connected,
    conversions: { available, token, refusal, refusedAt: refusal ? "2026-10-06T13:00:00.000Z" : null },
  })
  const tokenCard = () => screen.getByRole("region", { name: "Compras pelo servidor" })

  it("offers nothing about a token to a shop with no pixel saved: a token is one pixel's", () => {
    view()

    expect(screen.queryByRole("region", { name: "Compras pelo servidor" })).toBeNull()
    expect(mocks.token).toHaveBeenCalledWith("loja")
  })

  it("offers a shop with a pixel the token's field, never filled in, and saves what is pasted", async () => {
    with_({ connection: withToken("NONE") })
    const { container } = view()

    const field = within(tokenCard()).getByLabelText<HTMLInputElement>("Token de acesso da API de Conversões")
    expect(field).toHaveAttribute("type", "password")
    expect(field).toHaveValue("")
    await userEvent.click(field)
    await userEvent.paste(TOKEN)
    await userEvent.click(within(tokenCard()).getByRole("button", { name: "Salvar token" }))

    expect(saveToken).toHaveBeenCalledExactlyOnceWith(TOKEN)
    expect(container.innerHTML).not.toContain(TOKEN)
  })

  it("says a token was saved, over the page, and shows only that one is set", () => {
    with_({ connection: withToken("SET"), tokensSaved: 1 })
    view()

    expect(screen.getAllByRole("status").map((node) => node.textContent)).toContain("Token salvo. Faça um evento de teste para conferir.")
    expect(within(tokenCard()).getByText("Token salvo")).toBeInTheDocument()
    expect(within(tokenCard()).queryByLabelText(/token de acesso/i)).toBeNull()
  })

  it.each([
    ["META_PIXEL_TOKEN_INVALID", /Isso não parece um token de acesso/],
    ["INTEGRATION_UNAVAILABLE", "Guardar o token não está disponível nesta instalação do bee-link."],
    ["INTEGRATION_NOT_CONNECTED", "Salve o ID do pixel antes do token."],
    ["hasOwnProperty", "Não foi possível salvar o token. Tente de novo."],
  ] as const)("says the API's refusal of a token (%s) in words", (code, sentence) => {
    with_({ connection: withToken("NONE"), tokenRefusal: code })
    view()

    expect(within(tokenCard()).getByText(sentence)).toBeInTheDocument()
  })

  it.each([
    ["TOKEN_REJECTED", /O token foi recusado pela Meta/],
    ["PIXEL_NOT_FOUND", /A Meta não encontrou este pixel com este token/],
  ] as const)("says a token Meta refused (%s) needs attention, while the pixel stays connected", (refusal, sentence) => {
    with_({ connection: withToken("REJECTED", refusal) })
    view()

    expect(within(tokenCard()).getByText("Precisa de atenção")).toBeInTheDocument()
    expect(within(tokenCard()).getByRole("alert")).toHaveTextContent(sentence)
    expect(screen.getByText("Conectado")).toBeInTheDocument()
  })

  it("says the token is unavailable in a deployment that cannot keep one, and offers no field", () => {
    with_({ connection: withToken("NONE", null, false) })
    view()

    expect(within(tokenCard()).getByText("Indisponível")).toBeInTheDocument()
    expect(within(tokenCard()).queryByLabelText(/token de acesso/i)).toBeNull()
  })

  it("reads an answer kept from before the token existed as a deployment that keeps none", () => {
    with_({ connection: { status: connected.status, pixelId: connected.pixelId, connectedAt: connected.connectedAt } as MetaPixelConnection })
    view()

    expect(within(tokenCard()).getByText("Indisponível")).toBeInTheDocument()
  })

  it("removes the token after asking, and says so when it does not go through", async () => {
    with_({ connection: withToken("SET"), tokenRemoveFailed: true })
    view()

    expect(within(tokenCard()).getByText("Não foi possível remover o token. Tente de novo.")).toBeInTheDocument()
    await userEvent.click(within(tokenCard()).getByRole("button", { name: "Remover o token" }))
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Remover" }))

    expect(removeToken).toHaveBeenCalledOnce()
  })

  it("sends a test event with the code typed", async () => {
    with_({ connection: withToken("SET") })
    view()

    await userEvent.type(within(tokenCard()).getByLabelText("Código de teste"), "TEST12345")
    await userEvent.click(within(tokenCard()).getByRole("button", { name: "Enviar evento de teste" }))

    expect(sendTest).toHaveBeenCalledExactlyOnceWith({ testEventCode: "TEST12345" })
  })

  it.each([
    ["ACCEPTED", null, /A Meta aceitou o evento/],
    ["TOKEN_REJECTED", "Meta refused (400, code 190): expired", /A Meta recusou o token/],
    ["PIXEL_NOT_FOUND", "Meta refused (400, code 100, subcode 33): Unsupported post request", /A Meta não encontrou este pixel com este token/],
    ["EVENT_REFUSED", "Meta refused (400, code 100): Invalid parameter", /A Meta aceitou o token, mas recusou o evento/],
    ["UNREACHABLE", null, /Não foi possível falar com a Meta agora/],
  ] as const)("says Meta's answer to a test (%s) in plain words", (outcome, detail, sentence) => {
    with_({ connection: withToken("SET"), tested: { outcome, detail } })
    view()

    const said = within(tokenCard()).getByRole("status")
    expect(said).toHaveTextContent(sentence)
    if (detail) expect(said).toHaveTextContent(`Resposta da Meta: ${detail}`)
    else expect(said).not.toHaveTextContent("Resposta da Meta")
  })

  it.each([
    ["RATE_LIMITED", "Muitas tentativas. Espere um minuto e tente de novo."],
    ["META_PIXEL_TEST_CODE_INVALID", /Isso não parece um código de teste/],
    ["INTEGRATION_NOT_CONNECTED", "Salve um token antes de fazer o teste."],
    ["nonsense", "Não foi possível fazer o teste. Tente de novo."],
  ] as const)("says why a test was not made (%s)", (code, sentence) => {
    with_({ connection: withToken("SET"), testError: new IntegrationError(code) })
    view()

    expect(within(tokenCard()).getByText(sentence)).toBeInTheDocument()
  })

  /**
   * The token's sentences have their own rule. One that speaks of purchases going to Meta says whose:
   * those who accept the cookies. The test event is the one thing sent about nobody, and says so.
   */
  it.each([["pt-BR", ui], ["en", en]] as const)("speaks of purchases reaching Meta, in %s, only for those who accept the cookies", (_name, messages) => {
    const sentences = (value: unknown): string[] => (typeof value === "string" ? [value] : Object.values(value as object).flatMap(sentences))
    const { test, ...token } = messages.integrations.metaConversions
    // Whole sentences: a title names the card and claims nothing. One that says the telling stops is no promise of it.
    const ofPurchases = sentences(token).filter((sentence) => /\.$/.test(sentence) && /compra|purchase/i.test(sentence) && /meta|servidor|server/i.test(sentence) && !/deixa de|stops/i.test(sentence))

    expect(ofPurchases.length).toBeGreaterThanOrEqual(3)
    for (const sentence of ofPurchases) expect(sentence).toMatch(/aceit|accept/i)
    expect(test.lead).toMatch(/não é uma compra e não leva dados de ninguém|no purchase and carries nobody's data/)
    expect(sentences(messages.integrations.metaConversions).join(" ")).not.toMatch(/todas as compras|every purchase|all purchases|está medindo|is measuring|is tracking/i)
  })
})
