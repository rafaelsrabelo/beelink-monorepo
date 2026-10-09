// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { CustomDomainOverview } from "@harness-monorepo/contracts"

// UI
import { en } from "@harness-monorepo/ui/locales/en"
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { CustomDomainRequestError } from "@/services/custom-domain/custom-domain-requests"
import { CustomDomainScreen } from "./custom-domain-screen"

const mocks = vi.hoisted(() => ({ overview: vi.fn(), save: vi.fn(), check: vi.fn(), remove: vi.fn() }))
vi.mock("@/services/custom-domain/custom-domain-hooks", () => ({
  useCustomDomain: mocks.overview,
  useSaveCustomDomain: mocks.save,
  useCheckCustomDomain: mocks.check,
  useRemoveCustomDomain: mocks.remove,
}))

/** Documentation addresses (RFC 5737): nobody's servers. */
const TARGET = "203.0.113.10"
const ELSEWHERE = "198.51.100.7"
const HOST = "minhaloja.com.br"

const none: CustomDomainOverview = { targetIps: [TARGET], domain: null, check: null }
const pending: CustomDomainOverview = {
  targetIps: [TARGET],
  domain: { host: HOST, status: "PENDING", checkedAt: "2026-10-08T17:20:00.000Z", problem: "DNS_POINTS_ELSEWHERE" },
  check: { problem: "DNS_POINTS_ELSEWHERE", addresses: [ELSEWHERE], www: { problem: "DNS_NOT_FOUND", addresses: [] } },
}
const active: CustomDomainOverview = {
  targetIps: [TARGET],
  domain: { host: HOST, status: "ACTIVE", checkedAt: "2026-10-08T19:05:00.000Z", problem: null },
  check: null,
}

const save = vi.fn()
const check = vi.fn()
const remove = vi.fn()
const resets = { save: vi.fn(), check: vi.fn(), remove: vi.fn() }

interface State {
  overview?: CustomDomainOverview
  saving?: boolean
  saved?: boolean
  saveError?: Error | null
  checking?: boolean
  checked?: boolean
  checkError?: Error | null
  removing?: boolean
  removed?: boolean
  removeFailed?: boolean
}

function with_(state: State) {
  mocks.overview.mockReturnValue({ isPending: false, isError: false, data: state.overview ?? none })
  mocks.save.mockReturnValue({ mutate: save, reset: resets.save, isPending: state.saving ?? false, isSuccess: state.saved ?? false, isError: Boolean(state.saveError), error: state.saveError ?? null })
  mocks.check.mockReturnValue({ mutate: check, reset: resets.check, isPending: state.checking ?? false, isSuccess: state.checked ?? false, isError: Boolean(state.checkError), error: state.checkError ?? null })
  mocks.remove.mockReturnValue({ mutate: remove, reset: resets.remove, isPending: state.removing ?? false, isSuccess: state.removed ?? false, isError: state.removeFailed ?? false })
}

const view = (messages = ui) => render(<CustomDomainScreen slug="loja" locale="pt-BR" address="beelink.biz/loja" back={{ href: "/admin/loja", label: "Início" }} messages={messages} />)
const field = () => screen.getByLabelText<HTMLInputElement>("Seu domínio")
const records = () => screen.getByRole("region", { name: "O que configurar no seu provedor" })

beforeEach(() => {
  for (const mock of [save, check, remove, ...Object.values(resets)]) mock.mockReset()
  with_({})
})

describe("CustomDomainScreen (BEELINK-285), for a shop with no domain", () => {
  it("is a page of its own: the way back to the panel's home, the card as its title, and nothing configured", () => {
    view()

    expect(screen.getByRole("heading", { level: 1, name: "Domínio próprio" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Início" })).toHaveAttribute("href", "/admin/loja")
    expect(screen.getByText("Não configurado")).toBeInTheDocument()
    expect(screen.getByText(/deixa de ser beelink\.biz\/loja e passa a ser o seu/)).toBeInTheDocument()
    expect(mocks.overview).toHaveBeenCalledWith("loja")
    expect(screen.queryByRole("status")).toBeNull()
  })

  /** The records can be created first, so that the first save already finds the domain right. */
  it("shows what to create at the provider before any domain is saved, with the server's address", () => {
    view()

    expect(within(records()).getByText(TARGET)).toBeInTheDocument()
    expect(within(records()).getAllByRole("row")).toHaveLength(3)
  })

  it("saves the domain as it was typed: the API alone reads it down to a host", async () => {
    view()

    await userEvent.click(field())
    await userEvent.paste("https://www.MinhaLoja.com.br/")
    await userEvent.click(screen.getByRole("button", { name: "Salvar domínio" }))

    expect(save).toHaveBeenCalledExactlyOnceWith({ domain: "https://www.MinhaLoja.com.br/" })
  })

  it.each([
    ["CUSTOM_DOMAIN_INVALID", "Isso não parece um domínio. Digite só o domínio, como seudominio.com.br."],
    ["CUSTOM_DOMAIN_IP_ADDRESS", "Isso é um endereço IP. Digite o nome do domínio, como seudominio.com.br."],
    ["CUSTOM_DOMAIN_LOCAL", "Esse nome só existe dentro de uma rede. Use um domínio registrado na internet."],
    ["CUSTOM_DOMAIN_NOT_ASCII", "Um domínio com acento ou outro caractere especial precisa ser informado na forma que começa com xn--. O site onde o domínio foi registrado mostra essa forma."],
    ["CUSTOM_DOMAIN_PLATFORM", "Esse é um endereço do próprio bee-link. Informe um domínio seu."],
    ["CUSTOM_DOMAIN_TAKEN", "Esse domínio já está em uso por outra página do bee-link. Se ele é seu, fale com o suporte."],
    ["CUSTOM_DOMAIN_UNAVAILABLE", "O domínio próprio não está disponível nesta instalação do bee-link."],
    ["RATE_LIMITED", "Muitas tentativas. Espere um minuto e tente de novo."],
  ])("says the API's refusal %s as its own sentence, under the field", (code, sentence) => {
    with_({ saveError: new CustomDomainRequestError(code) })
    view()

    expect(screen.getByRole("alert")).toHaveTextContent(sentence)
    expect(field()).toHaveAttribute("aria-invalid", "true")
  })

  it.each([["a code it has no sentence for", new CustomDomainRequestError("STORE_FORBIDDEN")], ["no answer of the API's", new TypeError("Failed to fetch")]])("says a save that did not go through, for %s", (_what, saveError) => {
    with_({ saveError })
    view()

    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível salvar o domínio agora. Tente de novo.")
  })

  it("locks the field while the domain is saved and checked", () => {
    with_({ saving: true })
    view()

    expect(field()).toBeDisabled()
    expect(screen.getByRole("button", { name: "Salvando…" })).toBeDisabled()
  })
})

describe("CustomDomainScreen, with a domain saved", () => {
  it("says the domain is waiting, when it was last checked in the shop's time, and what the check found with the addresses it told", () => {
    with_({ overview: pending })
    view()

    expect(screen.getByText("Aguardando")).toBeInTheDocument()
    expect(screen.getByText("Domínio").nextElementSibling).toHaveTextContent(HOST)
    expect(screen.getByText("Última verificação").nextElementSibling).toHaveTextContent("08/10/2026, 14:20")
    expect(screen.getByText(/aponta para outro lugar/)).toHaveTextContent(`O domínio ${HOST} aponta para outro lugar: ${ELSEWHERE}. Ele precisa apontar só para ${TARGET}:`)
    expect(screen.queryByRole("textbox")).toBeNull()
    expect(records()).toBeInTheDocument()
    // Read as saved, not just saved: nothing is announced.
    expect(screen.queryByText(/Domínio salvo/)).toBeNull()
  })

  it("says once, over the page, that the domain was saved there and then — as not active yet, or as active", () => {
    with_({ overview: pending, saved: true })
    const { unmount } = view()
    expect(screen.getByText("Domínio salvo. Ele ainda não está ativo: veja nesta página o que falta.")).toHaveAttribute("role", "status")
    unmount()

    with_({ overview: active, saved: true })
    view()
    expect(screen.getByText("Domínio salvo e ativo.")).toHaveAttribute("role", "status")
  })

  /** The proxy reads which host is which shop's once a minute: "active" here may be a minute ahead of the shop window. */
  it("says an active domain opens the page, that the platform's address leads to it, and that a change takes up to a minute", () => {
    with_({ overview: active })
    view()

    expect(screen.getByText("Ativo")).toHaveAttribute("data-variant", "success")
    expect(screen.getByText(`${HOST} já abre a sua página, e beelink.biz/loja passa a levar para lá. Quando um domínio é ativado ou removido, a mudança pode levar até um minuto para aparecer.`)).toBeInTheDocument()
    expect(screen.getByText("Última verificação").nextElementSibling).toHaveTextContent("08/10/2026, 16:05")
  })

  it("checks again when asked, and forgets what a save or a removal last said", async () => {
    with_({ overview: pending, saved: true })
    view()

    await userEvent.click(screen.getByRole("button", { name: "Verificar de novo" }))

    expect(check).toHaveBeenCalledOnce()
    expect(resets.save).toHaveBeenCalledOnce()
    expect(resets.remove).toHaveBeenCalledOnce()
    expect(resets.check).not.toHaveBeenCalled()
  })

  it("reads out what a check that just came back found", () => {
    with_({ overview: pending, checked: true })
    const { unmount } = view()
    expect(screen.getByText("Verificação feita: ainda há um problema. Veja os detalhes nesta página.")).toHaveAttribute("role", "status")
    unmount()

    with_({ overview: active, checked: true })
    view()
    expect(screen.getByText("Verificação feita: está tudo certo com o domínio.")).toHaveAttribute("role", "status")
  })

  it.each([
    ["CUSTOM_DOMAIN_NOT_SET", "Não há mais um domínio salvo para verificar. Recarregue a página."],
    ["RATE_LIMITED", "Muitas tentativas. Espere um minuto e tente de novo."],
    ["CUSTOM_DOMAIN_UNAVAILABLE", "O domínio próprio não está disponível nesta instalação do bee-link."],
    ["SERVICE_UNAVAILABLE", "Não foi possível verificar o domínio agora. Tente de novo."],
  ])("says a check that was refused with %s, and holds both ways out while one runs", (code, sentence) => {
    with_({ overview: pending, checkError: new CustomDomainRequestError(code) })
    const { unmount } = view()
    expect(screen.getByRole("alert")).toHaveTextContent(sentence)
    unmount()

    with_({ overview: pending, checking: true })
    view()
    expect(screen.getByRole("button", { name: "Verificando…" })).toHaveAttribute("aria-disabled", "true")
    expect(screen.getByRole("button", { name: "Remover domínio" })).toHaveAttribute("aria-disabled", "true")
  })

  it("asks before removing, says the minute it takes, and removes only once confirmed", async () => {
    with_({ overview: active, checked: true })
    view()

    await userEvent.click(screen.getByRole("button", { name: "Remover domínio" }))
    const dialog = await screen.findByRole("alertdialog", { name: `Remover o domínio ${HOST}?` })
    expect(dialog).toHaveTextContent("A sua página volta a abrir só em beelink.biz/loja")
    expect(dialog).toHaveTextContent("A mudança pode levar até um minuto para aparecer.")
    expect(remove).not.toHaveBeenCalled()

    await userEvent.click(within(dialog).getByRole("button", { name: "Remover domínio" }))
    expect(remove).toHaveBeenCalledOnce()
    expect(resets.save).toHaveBeenCalledOnce()
    expect(resets.check).toHaveBeenCalledOnce()
  })

  it("keeps the domain when the question is answered with keeping it", async () => {
    with_({ overview: active })
    view()

    await userEvent.click(screen.getByRole("button", { name: "Remover domínio" }))
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Manter domínio" }))

    expect(remove).not.toHaveBeenCalled()
  })

  it("says a removal that did not go through", () => {
    with_({ overview: active, removeFailed: true })
    view()

    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível remover o domínio agora. Tente de novo.")
  })

  /** "Domínio removido" over a shop whose domain is still there would be about nothing — and so would "salvo" over none. */
  it("says the domain was removed, with the address the page is back at and the minute it takes, only once it is gone", () => {
    with_({ overview: none, removed: true })
    const { unmount } = view()
    expect(screen.getByText("Domínio removido. O endereço volta a ser beelink.biz/loja; a mudança pode levar até um minuto para aparecer.")).toHaveAttribute("role", "status")
    expect(field()).toBeInTheDocument()
    unmount()

    // While the read that follows the removal is on its way, the domain is still what is in hand.
    with_({ overview: active, removed: true })
    const again = view()
    expect(screen.queryByText(/Domínio removido/)).toBeNull()
    again.unmount()

    with_({ overview: none, saved: true })
    view()
    expect(screen.queryByText(/Domínio salvo/)).toBeNull()
  })

  it("forgets what a check or a removal last said when another domain is saved", async () => {
    with_({ overview: none, removed: true, checked: true })
    view()

    await userEvent.type(field(), HOST)
    await userEvent.click(screen.getByRole("button", { name: "Salvar domínio" }))

    expect(save).toHaveBeenCalledExactlyOnceWith({ domain: HOST })
    expect(resets.check).toHaveBeenCalledOnce()
    expect(resets.remove).toHaveBeenCalledOnce()
  })
})

describe("CustomDomainScreen, where the deployment names no address to point at", () => {
  it("says a domain of one's own is not available, with no field and no records", () => {
    with_({ overview: { targetIps: null, domain: null, check: null } })
    view()

    expect(screen.getByText("Indisponível")).toBeInTheDocument()
    expect(screen.getByText("O domínio próprio não está disponível nesta instalação do bee-link.")).toBeInTheDocument()
    expect(screen.queryByRole("textbox")).toBeNull()
    expect(screen.queryByRole("table")).toBeNull()
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("still shows a domain saved there before, to be removed and nothing else", () => {
    with_({ overview: { ...pending, targetIps: null, check: null } })
    view()

    expect(screen.getByText("Domínio").nextElementSibling).toHaveTextContent(HOST)
    expect(screen.getByRole("button", { name: "Remover domínio" })).toBeEnabled()
    expect(screen.queryByRole("button", { name: "Verificar de novo" })).toBeNull()
    expect(screen.queryByRole("table")).toBeNull()
  })
})

describe("CustomDomainScreen, before the domain is read", () => {
  it("holds the page's place with grey shapes — never a spinner or a word — and still says which page it is", () => {
    mocks.overview.mockReturnValue({ isPending: true, isError: false })
    const { container } = view()

    expect(screen.getByRole("heading", { level: 1, name: "Domínio próprio" })).toBeInTheDocument()
    expect(container.querySelectorAll("[data-slot='skeleton']").length).toBeGreaterThan(0)
    expect(screen.queryByText(/carregando/i)).toBeNull()
    expect(screen.queryByRole("textbox")).toBeNull()
    expect(screen.queryByText("Não configurado")).toBeNull()
  })

  /** A read that failed is not a shop with no domain: it may well have one. */
  it("says a read that failed, never as a shop with no domain, and reads again when asked", async () => {
    const refetch = vi.fn()
    mocks.overview.mockReturnValue({ isPending: false, isError: true, refetch })
    view()

    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar o domínio.")
    expect(screen.queryByText("Não configurado")).toBeNull()
    expect(screen.queryByRole("textbox")).toBeNull()
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }))
    expect(refetch).toHaveBeenCalledOnce()
  })
})

describe("CustomDomainScreen, its words", () => {
  /** The screen is a site's as much as a shop's (the panel's home has its own sentences for a site for this very reason). */
  it.each([["pt-BR", ui], ["en", en]] as const)("never say shop, in %s", (_name, messages) => {
    const sentences = (value: unknown): string[] => (typeof value === "string" ? [value] : Object.values(value as object).flatMap(sentences))
    const said = sentences(messages.customDomain).join(" ")

    expect(said).not.toMatch(/\blojas?\b|\bshops?\b|\bstores?\b/i)
  })

  it("are spoken in the language the screen is handed", () => {
    with_({ overview: active })
    view(en)

    expect(screen.getByRole("heading", { level: 1, name: "Your own domain" })).toBeInTheDocument()
    expect(screen.getByText("Active")).toBeInTheDocument()
    expect(screen.getByRole("region", { name: "What to set up at your provider" })).toBeInTheDocument()
  })
})
