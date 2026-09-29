// Libs
import { fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { ConversationFilters } from "./conversation-filters"
import { ConversationList, type ConversationListRow } from "./conversation-list"
import { ConversationReply } from "./conversation-reply"
import { ConversationThread, type ConversationLine } from "./conversation-thread"

const rows: ConversationListRow[] = [
  { number: 18, customer: "Carla", order: "Pedido nº 18 · Em preparo", preview: "Chega sexta?", when: "10:40", unread: 2, closed: false, href: "/c?pedido=18" },
  { number: 13, customer: "Bia", order: "Pedido nº 13 · Entregue", preview: "Você: Obrigada!", when: "09:12", unread: 0, closed: true, href: "/c?pedido=13" },
]

const lines: ConversationLine[] = [
  { id: "1", mine: false, body: "Chega sexta?", when: "10:02" },
  { id: "2", mine: true, body: "Chega, sim.", when: "10:40", seen: "Lida" },
]

describe("the panel's conversations", () => {
  it("lists who, which order, the last line and what waits, marking the one open", () => {
    render(<ConversationList rows={rows} current={18} />)
    const [open, ended] = screen.getAllByRole("listitem")
    expect(within(open!).getByRole("link")).toHaveAttribute("aria-current", "true")
    expect(within(open!).getByText("2 não lidas")).toBeInTheDocument()
    expect(within(ended!).getByText("Encerrada")).toBeInTheDocument()
  })

  it("draws each side, and the answer only while the conversation is open", () => {
    const { rerender } = render(<ConversationThread customer="Carla" order="Pedido nº 18" orderHref="/o/18" customerHref="/c/1" lines={lines} state="open" reply={<p>resposta</p>} />)
    expect(screen.getByRole("heading", { name: "Carla" })).toHaveFocus()
    expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("Cliente: Chega sexta?")
    expect(screen.getAllByRole("listitem")[1]).toHaveTextContent("10:40 · Lida")
    expect(screen.getByText("resposta")).toBeInTheDocument()

    rerender(<ConversationThread customer="Carla" order="Pedido nº 18" lines={lines} state="closed" reply={<p>resposta</p>} />)
    expect(screen.getByText(/só histórico/)).toBeInTheDocument()
    expect(screen.queryByText("resposta")).toBeNull()

    rerender(<ConversationThread customer="Carla" order="Pedido nº 18" lines={[]} state="empty" reply={<p>resposta</p>} />)
    expect(screen.getByText(/ainda não escreveu/)).toBeInTheDocument()
  })

  it("answers on Enter, keeps the line on Shift+Enter, and says why an answer failed", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<ConversationReply value="Oi" onChange={() => undefined} onSubmit={onSubmit} error="A resposta não foi enviada. Tente de novo." />)
    const field = screen.getByRole("textbox", { name: "Resposta ao cliente" })
    await user.type(field, "{Shift>}{Enter}{/Shift}")
    expect(onSubmit).not.toHaveBeenCalled()
    await user.type(field, "{Enter}")
    expect(onSubmit).toHaveBeenCalledOnce()
    expect(screen.getByRole("alert")).toHaveTextContent("não foi enviada")
  })

  it("filters by link, and searches on submit", () => {
    const onSearch = vi.fn()
    render(<ConversationFilters filters={[{ key: "OPEN", label: "Abertas", href: "/c", active: true }, { key: "ALL", label: "Todas", href: "/c?filtro=all", active: false }]} search="" onSearch={onSearch} />)
    expect(screen.getByRole("link", { name: "Abertas" })).toHaveAttribute("aria-current", "true")
    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar conversas" }), { target: { value: " Carla " } })
    fireEvent.submit(screen.getByRole("search"))
    expect(onSearch).toHaveBeenCalledWith("Carla")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <div>
        <ConversationList rows={rows} />
        <ConversationThread customer="Carla" order="Pedido nº 18" lines={lines} state="open" reply={<ConversationReply value="" onChange={() => undefined} onSubmit={() => undefined} canSend={false} />} />
      </div>,
    )
    await expectNoA11yViolations(container)
  })
})
