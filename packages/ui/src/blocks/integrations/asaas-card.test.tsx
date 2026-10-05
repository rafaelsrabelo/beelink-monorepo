// Libs
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// UI
import type { AsaasCardView } from "@harness-monorepo/ui/lib/integrations"

// Locales
import { en } from "@harness-monorepo/ui/locales/index"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { AsaasCard, type AsaasCardProps } from "./asaas-card"
import { asaasConnected, asaasDisconnected } from "./integrations.fixtures"

/** Typed by the tests, and nobody's key. */
const TYPED = "$aact_hmlg_chave-de-teste"

function show(view: AsaasCardView, props: Partial<AsaasCardProps> = {}) {
  const onConnect = vi.fn()
  const onDisconnect = vi.fn()
  const result = render(<AsaasCard view={view} onConnect={onConnect} onDisconnect={onDisconnect} {...props} />)
  const again = (next: AsaasCardView, more: Partial<AsaasCardProps> = {}) => result.rerender(<AsaasCard view={next} onConnect={onConnect} onDisconnect={onDisconnect} {...props} {...more} />)
  return { ...result, again, onConnect, onDisconnect }
}

const card = () => screen.getByRole("region", { name: "Asaas" })
const field = () => screen.getByLabelText<HTMLInputElement>("Chave de API")

describe("AsaasCard, for a shop yet to connect", () => {
  it("says what connecting gives, takes the key, and says where a key is found", async () => {
    const { container, onConnect } = show(asaasDisconnected)

    expect(within(card()).getByText("Não conectado")).toBeInTheDocument()
    expect(within(card()).getByText(/o dinheiro cai direto na sua conta Asaas/)).toBeInTheDocument()
    expect(field()).toHaveAccessibleDescription(/Integrações > Chaves de API/)
    expect(screen.queryByRole("button", { name: "Desconectar" })).toBeNull()

    await userEvent.type(field(), TYPED)
    await userEvent.click(screen.getByRole("button", { name: "Conectar" }))
    expect(onConnect).toHaveBeenCalledExactlyOnceWith(TYPED)
    await expectNoA11yViolations(container)
  })

  it("leads whoever has no account to open one, in another tab that cannot reach back into the panel", () => {
    show(asaasDisconnected)

    const signUp = screen.getByRole("link", { name: "Criar conta no Asaas (abre em nova aba)" })
    expect(signUp).toHaveAttribute("href", "https://sandbox.asaas.com")
    expect(signUp).toHaveAttribute("target", "_blank")
    expect(signUp).toHaveAttribute("rel", "noopener noreferrer")
  })

  /** On a phone nothing can be hovered: what the sandbox means is in the card, not only in the badge's hint. */
  it("says in so many words that the sandbox charges nobody, and nothing of it in production", () => {
    const { again } = show(asaasDisconnected)
    expect(screen.getByText("Sandbox")).toHaveAttribute("title", "Ambiente de testes do Asaas: nada é cobrado de verdade.")
    expect(screen.getByText(/a conta e a chave são as do sandbox, e nada é cobrado de verdade/)).toBeInTheDocument()

    again({ ...asaasDisconnected, sandbox: false, signUpHref: "https://www.asaas.com" })
    expect(screen.queryByText("Sandbox")).toBeNull()
    expect(screen.queryByText(/nada é cobrado de verdade/)).toBeNull()
    expect(screen.getByRole("link", { name: /Criar conta no Asaas/ })).toHaveAttribute("href", "https://www.asaas.com")
  })

  it("locks the key and the button while Asaas is asked", () => {
    show(asaasDisconnected, { connecting: true })

    expect(field()).toBeDisabled()
    expect(screen.getByRole("button", { name: "Conectando…" })).toBeDisabled()
  })

  it("says why a key was refused under the field, in the words it is handed", () => {
    const refusal = "Essa chave não é do ambiente de testes. Esta instalação só aceita chaves do sandbox do Asaas, que começam com $aact_hmlg_."
    show(asaasDisconnected, { connectError: refusal })

    expect(screen.getByRole("alert")).toHaveTextContent(refusal)
    expect(field()).toHaveAccessibleDescription(new RegExp("^Essa chave não é do ambiente de testes"))
  })

  it("says this installation cannot seal a key, offering nothing to press, in the language it is handed", () => {
    show({ ...asaasDisconnected, available: false }, { messages: en })

    expect(screen.getByText("Asaas is not set up on this installation yet.")).toBeInTheDocument()
    expect(screen.queryByRole("textbox")).toBeNull()
    expect(screen.queryByRole("button")).toBeNull()
    expect(screen.queryByRole("link")).toBeNull()
    expect(screen.queryByText("Sandbox")).toBeNull()
    expect(screen.queryByText("Not connected")).toBeNull()
  })
})

describe("AsaasCard, connected", () => {
  it("says whose account it is, its document masked, and that its payment notices are on", async () => {
    const { container } = show(asaasConnected)

    expect(within(card()).getByText("Conectado")).toBeInTheDocument()
    expect(screen.getByText("Conta").nextElementSibling).toHaveTextContent("Lessari Moda LTDA**.222.333/0001-**")
    expect(screen.getByText("Avisos de pagamento").nextElementSibling).toHaveTextContent("AtivosO Asaas avisa o bee-link quando um pagamento muda.")
    // No key to type, and no account to open: the shop has both.
    expect(screen.queryByLabelText("Chave de API")).toBeNull()
    expect(screen.queryByRole("link")).toBeNull()
    await expectNoA11yViolations(container)
  })

  it("shows the name alone for an account whose document Asaas did not give", () => {
    show({ ...asaasConnected, account: { name: "Maria Lessari", document: null } })

    expect(screen.getByText("Conta").nextElementSibling).toHaveTextContent(/^Maria Lessari$/)
  })

  it.each([
    ["SKIPPED", "Não cadastrados neste ambiente", "Os pagamentos são conferidos por consulta."],
    ["PAUSED", "Pausados pelo Asaas", "Para reativar os avisos, conecte de novo em “Trocar a chave”."],
    ["ERROR", "Não cadastrados", "Para tentar outra vez, conecte de novo em “Trocar a chave”."],
  ] as const)("says where the payment notices stand when they are %s", (webhook, state, hint) => {
    show({ ...asaasConnected, webhook })

    const notices = screen.getByText("Avisos de pagamento").nextElementSibling
    expect(notices).toHaveTextContent(state)
    expect(notices).toHaveTextContent(hint)
  })

  it("replaces the key with the same field, sends the new one, and can be left without sending anything", async () => {
    const { onConnect } = show(asaasConnected)

    await userEvent.click(screen.getByRole("button", { name: "Trocar a chave" }))
    const replacement = screen.getByLabelText("Nova chave de API")
    // The field arrives with the focus: it is what the button was pressed for.
    expect(replacement).toHaveFocus()
    expect(replacement).toHaveAttribute("type", "password")
    expect(screen.queryByRole("button", { name: "Desconectar" })).toBeNull()

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(screen.queryByLabelText("Nova chave de API")).toBeNull()
    expect(screen.getByRole("button", { name: "Trocar a chave" })).toHaveFocus()
    expect(onConnect).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole("button", { name: "Trocar a chave" }))
    await userEvent.type(screen.getByLabelText("Nova chave de API"), TYPED)
    await userEvent.click(screen.getByRole("button", { name: "Conectar com a nova chave" }))
    expect(onConnect).toHaveBeenCalledExactlyOnceWith(TYPED)
  })

  /** A refusal belongs to the try it answered: left behind, it would greet the next, empty form. */
  it("says when the replacement is left, so a refusal said in it can be forgotten", async () => {
    const onReplaceCancel = vi.fn()
    show(asaasConnected, { onReplaceCancel, connectError: "O Asaas não respondeu. Tente de novo em instantes." })

    await userEvent.click(screen.getByRole("button", { name: "Trocar a chave" }))
    expect(screen.getByRole("alert")).toHaveTextContent("O Asaas não respondeu.")
    expect(onReplaceCancel).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(onReplaceCancel).toHaveBeenCalledOnce()
  })

  /** The form belongs to the connection it was opened on: nothing has to tell the card the key was taken. */
  it("closes the replacement, with what was typed in it, once another connection takes this one's place", async () => {
    const { again, container } = show(asaasConnected)
    await userEvent.click(screen.getByRole("button", { name: "Trocar a chave" }))
    await userEvent.type(screen.getByLabelText("Nova chave de API"), TYPED)

    // Refused, or still being asked: the same connection, and the form stays with its key.
    again(asaasConnected, { connecting: true })
    again(asaasConnected, { connectError: "O Asaas não respondeu. Tente de novo em instantes." })
    expect(screen.getByLabelText<HTMLInputElement>("Nova chave de API").value).toBe(TYPED)

    again({ ...asaasConnected, connectedAt: "2026-10-05T12:30:00.000Z", account: { name: "Maria Lessari", document: "***.456.789-**" } })
    expect(screen.queryByLabelText("Nova chave de API")).toBeNull()
    expect(container.querySelector("input")).toBeNull()
    expect(screen.getByText("Conta").nextElementSibling).toHaveTextContent("Maria Lessari***.456.789-**")
    expect(screen.getByRole("button", { name: "Trocar a chave" })).toHaveFocus()

    // Opened again, it starts empty.
    await userEvent.click(screen.getByRole("button", { name: "Trocar a chave" }))
    expect(screen.getByLabelText<HTMLInputElement>("Nova chave de API").value).toBe("")
  })

  it("asks before disconnecting, keeping the connection on the default answer", async () => {
    const { onDisconnect } = show(asaasConnected)

    await userEvent.click(screen.getByRole("button", { name: "Desconectar" }))
    const dialog = screen.getByRole("alertdialog", { name: "Desconectar o Asaas?" })
    expect(dialog).toHaveTextContent("As formas de pagamento escolhidas ficam guardadas.")
    await waitFor(() => expect(within(dialog).getByRole("button", { name: "Manter conectado" })).toHaveFocus())
    await userEvent.click(within(dialog).getByRole("button", { name: "Manter conectado" }))
    expect(onDisconnect).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole("button", { name: "Desconectar" }))
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Desconectar" }))
    expect(onDisconnect).toHaveBeenCalledOnce()
  })

  it("holds its buttons while disconnecting, and says when that did not go through", () => {
    const { again } = show(asaasConnected, { disconnecting: true })
    expect(screen.getByRole("button", { name: "Desconectar" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Trocar a chave" })).toBeDisabled()

    again(asaasConnected, { disconnecting: false, disconnectError: "Não foi possível desconectar agora. Tente de novo." })
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível desconectar agora. Tente de novo.")
  })

  it("is the page's title where it stands for the page", () => {
    show(asaasConnected, { headingAs: "h1" })
    expect(screen.getByRole("heading", { level: 1, name: "Asaas" })).toBeInTheDocument()
  })
})

describe("AsaasCard, as the connection changes under it", () => {
  it("puts the focus on what replaced the key once connected, and back on the key once disconnected", async () => {
    const { again } = show(asaasDisconnected)
    // A page that loads leaves the focus where the reader is.
    expect(field()).not.toHaveFocus()

    again(asaasConnected)
    expect(screen.getByRole("button", { name: "Trocar a chave" })).toHaveFocus()

    again(asaasDisconnected)
    expect(field()).toHaveFocus()
    expect(field().value).toBe("")
  })
})

describe("AsaasCard, when Asaas stopped accepting the key", () => {
  it("warns, still says whose account it was, and takes a key to connect again", async () => {
    const { container, onConnect } = show({ ...asaasConnected, status: "NEEDS_RECONNECT" })

    expect(within(card()).getByText("Precisa reconectar")).toBeInTheDocument()
    expect(screen.getByRole("alert")).toHaveTextContent("O Asaas parou de aceitar a chave desta loja.")
    expect(screen.getByText("Conta").nextElementSibling).toHaveTextContent("Lessari Moda LTDA")
    // Mending the key registers the notices again: until then they say nothing.
    expect(screen.queryByText("Avisos de pagamento")).toBeNull()
    expect(screen.queryByRole("button", { name: "Trocar a chave" })).toBeNull()

    await userEvent.type(field(), TYPED)
    await userEvent.click(screen.getByRole("button", { name: "Conectar de novo" }))
    expect(onConnect).toHaveBeenCalledExactlyOnceWith(TYPED)
    expect(screen.getByRole("button", { name: "Desconectar" })).toBeEnabled()
    await expectNoA11yViolations(container)
  })
})
