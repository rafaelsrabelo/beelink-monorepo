// Libs
import { fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontConversationComposer } from "./storefront-conversation-composer"
import { StorefrontConversationFailed } from "./storefront-conversation-failed"
import { StorefrontConversationList, type StorefrontConversationRow } from "./storefront-conversation-list"
import { StorefrontConversationThread, type StorefrontConversationLine } from "./storefront-conversation-thread"
import { StorefrontConversationsLink } from "./storefront-conversations-link"
import { StorefrontConversationsPanel } from "./storefront-conversations-panel"
import { StorefrontOrderTalk } from "./storefront-order-talk"

const rows: StorefrontConversationRow[] = [
  { number: 18, title: "Pedido nº 18", preview: "Chega até sexta, sim!", when: "29 de set., 10:40", unread: 2, closed: false, href: "/loja/conta/conversas?pedido=18" },
  { number: 13, title: "Pedido nº 13", preview: "Você: Obrigada!", when: "20 de set., 09:12", unread: 0, closed: true, href: "/loja/conta/conversas?pedido=13" },
]

const lines: StorefrontConversationLine[] = [
  { id: "a", mine: true, body: "O pedido chega até sexta?", when: "10:02", seen: null },
  { id: "b", mine: false, body: "Chega, sim!\nSai amanhã cedo.", when: "10:40", seen: null },
  { id: "c", mine: true, body: "Obrigada!", when: "10:41", seen: "Lida" },
]

describe("the header's conversations link", () => {
  it("says the unread count in its name, opens in place on a plain click and leads to the page otherwise", () => {
    const onOpen = vi.fn()
    const { rerender } = render(<StorefrontConversationsLink href="/loja/conta/conversas" unread={3} onOpen={onOpen} />)

    const link = screen.getByRole("link", { name: "Conversas, 3 mensagens não lidas" })
    expect(link).toHaveAttribute("href", "/loja/conta/conversas")
    fireEvent.click(link)
    expect(onOpen).toHaveBeenCalledOnce()
    fireEvent.click(link, { ctrlKey: true })
    expect(onOpen).toHaveBeenCalledOnce()

    rerender(<StorefrontConversationsLink href="/loja/conta/conversas" unread={1} />)
    expect(screen.getByRole("link", { name: "Conversas, 1 mensagem não lida" })).toBeInTheDocument()
    rerender(<StorefrontConversationsLink href="/loja/conta/conversas" />)
    expect(screen.getByRole("link", { name: "Conversas" })).toBeInTheDocument()
  })
})

describe("Falar com a loja", () => {
  it("is a link to the order's conversation that opens it in place", () => {
    const onOpen = vi.fn()
    render(<StorefrontOrderTalk href="/loja/conta/conversas?pedido=18" onOpen={onOpen} />)

    const link = screen.getByRole("link", { name: "Falar com a loja" })
    expect(link).toHaveAttribute("href", "/loja/conta/conversas?pedido=18")
    fireEvent.click(link)
    expect(onOpen).toHaveBeenCalledOnce()
  })
})

describe("the conversations list", () => {
  it("names each order, its last line and when, how many wait unread, and the ones that ended", () => {
    const onSelect = vi.fn()
    render(<StorefrontConversationList rows={rows} onSelect={onSelect} />)

    const [open, ended] = screen.getAllByRole("listitem")
    expect(within(open!).getByText("Chega até sexta, sim!")).toBeInTheDocument()
    expect(within(open!).getByText("2 não lidas")).toBeInTheDocument()
    expect(within(ended!).getByText("Encerrada")).toBeInTheDocument()
    expect(within(ended!).getByText("Você: Obrigada!")).toBeInTheDocument()

    fireEvent.click(within(open!).getByRole("link"))
    expect(onSelect).toHaveBeenCalledWith(18)
  })

  it("says there is none yet, and where one starts", () => {
    render(<StorefrontConversationList rows={[]} />)
    expect(screen.getByText("Nenhuma conversa ainda.")).toBeInTheDocument()
    expect(screen.getByText(/toque em Falar com a loja/)).toBeInTheDocument()
  })
})

describe("one conversation", () => {
  it("draws each side's messages, oldest first, and whether the shop read the last one", () => {
    render(<StorefrontConversationThread title="Pedido nº 18" orderHref="/loja/conta/pedidos/18" back={{ href: "/loja/conta/conversas" }} lines={lines} closed={false} composer={<p>composer</p>} />)

    const items = screen.getAllByRole("listitem")
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent("Você: O pedido chega até sexta?")
    expect(items[1]).toHaveTextContent("A loja: Chega, sim!")
    expect(items[2]).toHaveTextContent("10:41 · Lida")
    expect(screen.getByRole("link", { name: "Ver pedido" })).toHaveAttribute("href", "/loja/conta/pedidos/18")
    expect(screen.getByRole("link", { name: "Voltar às conversas" })).toBeInTheDocument()
    expect(screen.getByText("composer")).toBeInTheDocument()
  })

  it("once the order is over, keeps the history and says the conversation ended with it, with no composer", () => {
    render(<StorefrontConversationThread title="Pedido nº 13" orderHref="#" lines={lines} closed composer={<p>composer</p>} />)
    expect(screen.getByText(/terminou junto com o pedido/)).toBeInTheDocument()
    expect(screen.queryByText("composer")).toBeNull()
    expect(screen.getAllByRole("listitem")).toHaveLength(3)
  })

  it("invites the first message while there is none", () => {
    render(<StorefrontConversationThread title="Pedido nº 20" orderHref="#" lines={[]} closed={false} />)
    expect(screen.getByText(/Escreva para a loja sobre este pedido/)).toBeInTheDocument()
  })
})

describe("the composer", () => {
  it("sends on Enter, breaks the line on Shift+Enter, and says why a send failed", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    const Composer = ({ value, error }: { value: string; error?: string }) => (
      <StorefrontConversationComposer value={value} onChange={() => undefined} onSubmit={onSubmit} error={error ?? null} />
    )
    const { rerender } = render(<Composer value="Oi" />)

    const field = screen.getByRole("textbox", { name: "Mensagem para a loja" })
    await user.type(field, "{Shift>}{Enter}{/Shift}")
    expect(onSubmit).not.toHaveBeenCalled()
    await user.type(field, "{Enter}")
    expect(onSubmit).toHaveBeenCalledOnce()

    rerender(<Composer value="Oi" error="A mensagem não foi enviada. Tente de novo." />)
    expect(screen.getByRole("alert")).toHaveTextContent("A mensagem não foi enviada")
    expect(field).toHaveAttribute("aria-invalid", "true")
  })

  it("sends nothing while sending, or with nothing to send", () => {
    const onSubmit = vi.fn()
    const { rerender } = render(<StorefrontConversationComposer value="Oi" onChange={() => undefined} onSubmit={onSubmit} pending />)
    expect(screen.getByRole("button", { name: "Enviando…" })).toBeDisabled()

    rerender(<StorefrontConversationComposer value="" onChange={() => undefined} onSubmit={onSubmit} canSend={false} />)
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})

describe("a read that failed", () => {
  it("says what did not load, and asks again", () => {
    const onRetry = vi.fn()
    render(<StorefrontConversationFailed message="As conversas não carregaram." onRetry={onRetry} />)
    expect(screen.getByRole("alert")).toHaveTextContent("As conversas não carregaram.")
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})

describe("the conversations panel", () => {
  it("opens with its title and a way to close it", () => {
    const onOpenChange = vi.fn()
    render(<StorefrontConversationsPanel open onOpenChange={onOpenChange}><p>lista</p></StorefrontConversationsPanel>)

    expect(screen.getByRole("dialog", { name: "Conversas" })).toBeInTheDocument()
    expect(screen.getByText("lista")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Fechar conversas" }))
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything())
  })
})

describe("accessibility", () => {
  it("has no violations in the list, a conversation and the composer", async () => {
    const { container } = render(
      <div>
        <StorefrontConversationList rows={rows} />
        <StorefrontConversationThread
          title="Pedido nº 18"
          orderHref="#"
          lines={lines}
          closed={false}
          composer={<StorefrontConversationComposer value="" onChange={() => undefined} onSubmit={() => undefined} canSend={false} />}
        />
      </div>,
    )
    await expectNoA11yViolations(container)
  })
})
