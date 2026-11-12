// Libs
import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { AffiliateInvitation } from "@harness-monorepo/contracts"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { AffiliateInviteError } from "@/services/affiliates/affiliate-invite-requests"
import { AffiliateInviteScreen } from "./affiliate-invite-screen"

const mocks = vi.hoisted(() => ({ invitation: vi.fn(), slug: vi.fn(), accept: vi.fn(), signUp: vi.fn(), signOut: vi.fn(), startOver: vi.fn() }))
vi.mock("@/services/affiliates/affiliate-invite-hooks", () => ({
  useAffiliateInvitation: mocks.invitation,
  useAffiliateSlugCheck: mocks.slug,
  useAcceptAffiliateInvite: mocks.accept,
  useAffiliateInviteSignUp: mocks.signUp,
}))
vi.mock("@/services/auth/auth-hooks", () => ({ useSignOut: mocks.signOut }))
vi.mock("@/lib/start-over", () => ({ startOver: mocks.startOver }))
// The hint follows the field at once: the debounce is the hook's own, and has its own test.
vi.mock("@/services/addresses/use-debounced-value", () => ({ useDebouncedValue: <T,>(value: T) => value }))

const invitation: AffiliateInvitation = {
  store: { name: "Lessari", slug: "lessari", logoUrl: null },
  affiliate: { name: "João Silva", email: "joao@exemplo.com" },
  table: { name: "Influencers", defaultRateBps: 1500, categories: [], products: [] },
  terms: { text: "Pago por Pix.", version: 3 },
  expiresAt: "2026-11-18T13:00:00.000Z",
  hasAccount: false,
  suggestedSlug: "joao",
}
const accept = vi.fn()
const signUp = vi.fn()
const signOut = vi.fn()
const refetch = vi.fn()
const mutation = (mutate: ReturnType<typeof vi.fn>, extra: object = {}) => ({ mutate, isPending: false, error: null, data: undefined, ...extra })

function renderScreen(props: { signedInEmail?: string | null; token?: string } = {}) {
  return render(<AffiliateInviteScreen token={props.token ?? "tok"} signedInEmail={props.signedInEmail ?? null} origin="https://beelink.com.br" locale="pt-BR" messages={ui} />)
}

beforeEach(() => {
  for (const fn of [accept, signUp, signOut, refetch, mocks.startOver]) fn.mockReset()
  mocks.invitation.mockReturnValue({ isPending: false, isError: false, data: invitation, refetch })
  mocks.slug.mockReturnValue({ data: { slug: "joao", available: true, reason: null }, isFetching: false })
  mocks.accept.mockReturnValue(mutation(accept))
  mocks.signUp.mockReturnValue(mutation(signUp))
  mocks.signOut.mockReturnValue(mutation(signOut))
})

describe("AffiliateInviteScreen (IMPULSEIA-104)", () => {
  it("makes the account and accepts", async () => {
    renderScreen()

    expect(screen.getByText("Disponível. Seu link fica beelink.com.br/lessari/joao")).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText("Crie uma senha"), "segredo123")
    await userEvent.click(screen.getByRole("checkbox", { name: "Li e aceito os termos da loja" }))
    await userEvent.click(screen.getByRole("button", { name: "Criar conta e aceitar" }))

    expect(signUp).toHaveBeenCalledWith({ slug: "joao", pixKey: null, termsVersion: 3, name: "João Silva", password: "segredo123" }, expect.anything())
  })

  it("hands over the link once either way accepted", () => {
    mocks.signUp.mockReturnValue(mutation(signUp, { data: { storeName: "Lessari", storeSlug: "lessari", slug: "joao" } }))
    renderScreen()

    expect(screen.getByText("Pronto! Você vende pela Lessari")).toBeInTheDocument()
    expect(screen.getByText("https://beelink.com.br/lessari/joao")).toBeInTheDocument()
  })

  it("accepts with the account signed in, asking no password", async () => {
    renderScreen({ signedInEmail: "Joao@Exemplo.com" })

    expect(screen.queryByLabelText("Crie uma senha")).toBeNull()
    await userEvent.click(screen.getByRole("checkbox", { name: "Li e aceito os termos da loja" }))
    await userEvent.click(screen.getByRole("button", { name: "Aceitar convite" }))
    expect(accept).toHaveBeenCalledWith({ slug: "joao", pixKey: null, termsVersion: 3 }, expect.anything())
  })

  it("sends an account that exists to sign in, coming back here", () => {
    mocks.invitation.mockReturnValue({ isPending: false, isError: false, data: { ...invitation, hasAccount: true }, refetch })
    renderScreen()

    expect(screen.getByRole("link", { name: "Entrar e aceitar" })).toHaveAttribute("href", "/login?voltar=%2Fafiliado%2Fconvite%3Ftoken%3Dtok")
  })

  it("says, signed in as someone else, whom the invite is for, and signs out to start over here", async () => {
    signOut.mockImplementation((_none, options: { onSettled: () => void }) => options.onSettled())
    renderScreen({ signedInEmail: "maria@exemplo.com" })

    expect(screen.getByText(/Você entrou como maria@exemplo.com, e o convite é para joao@exemplo.com/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Aceitar convite" })).toBeNull()
    await userEvent.click(screen.getByRole("button", { name: "Sair e continuar" }))
    expect(mocks.startOver).toHaveBeenCalledWith("/afiliado/convite?token=tok")
  })

  it("reads the invite again when the shop changed its terms meanwhile, and asks to agree again", async () => {
    signUp.mockImplementation((_payload, options: { onError: (error: Error) => void }) => options.onError(new AffiliateInviteError("AFFILIATE_TERMS_CHANGED", 409)))
    renderScreen()

    await userEvent.type(screen.getByLabelText("Crie uma senha"), "segredo123")
    await userEvent.click(screen.getByRole("checkbox", { name: "Li e aceito os termos da loja" }))
    await userEvent.click(screen.getByRole("button", { name: "Criar conta e aceitar" }))

    expect(refetch).toHaveBeenCalled()
    expect(screen.getByText("A loja mudou os termos enquanto você lia. Leia de novo antes de aceitar.")).toBeInTheDocument()
    expect(screen.getByRole("checkbox", { name: "Li e aceito os termos da loja" })).not.toBeChecked()
  })

  it("puts a /name taken meanwhile under its field, with the reason", async () => {
    signUp.mockImplementation((_payload, options: { onError: (error: Error) => void }) => act(() => options.onError(new AffiliateInviteError("AFFILIATE_SLUG_UNAVAILABLE", 409, { reason: "TAKEN" }))))
    renderScreen()

    await userEvent.type(screen.getByLabelText("Crie uma senha"), "segredo123")
    await userEvent.click(screen.getByRole("checkbox", { name: "Li e aceito os termos da loja" }))
    await userEvent.click(screen.getByRole("button", { name: "Criar conta e aceitar" }))
    expect(screen.getByLabelText("Seu nome no link")).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByText("Esse nome já está em uso nesta loja. Escolha outro.")).toBeInTheDocument()
  })

  it.each([
    ["AFFILIATE_INVITE_NOT_FOUND", 404, "Convite não encontrado"],
    ["AFFILIATE_INVITE_EXPIRED", 410, "Convite vencido"],
  ])("says an invite %s plainly", (code, status, title) => {
    mocks.invitation.mockReturnValue({ isPending: false, isError: true, error: new AffiliateInviteError(code, status), refetch })
    renderScreen()

    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /aceitar/i })).toBeNull()
  })

  it("says a link with no token is no invite, and draws a skeleton while one is read", () => {
    const { unmount } = renderScreen({ token: "" })
    expect(screen.getByRole("heading", { name: "Convite não encontrado" })).toBeInTheDocument()
    unmount()

    mocks.invitation.mockReturnValue({ isPending: true, isError: false, refetch })
    const { container } = renderScreen()
    expect(container.querySelector("[data-slot=skeleton]")).not.toBeNull()
  })
})
