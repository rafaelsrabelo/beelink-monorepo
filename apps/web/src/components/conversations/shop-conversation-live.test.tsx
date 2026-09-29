// Libs
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

// Types
import type { ShopConversation } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { ShopConversationLive } from "./shop-conversation-live"

const at = "2026-09-29T13:00:00.000Z"

function conversationWith(open: boolean, unread: number): ShopConversation {
  return {
    order: { number: 18, status: open ? "PREPARING" : "DELIVERED", fulfillment: "DELIVERY", open },
    customer: { id: "c1", name: "Carla" },
    unread,
    messages: [{ kind: "MESSAGE", id: "m1", author: "CUSTOMER", body: "Chega sexta?", createdAt: at, readAt: null }],
  }
}

function mount() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ShopConversationLive slug="loja" number={18} locale="pt-BR" messages={ptBR} />
    </QueryClientProvider>,
  )
}

const pathsOf = (fetched: ReturnType<typeof vi.fn>) => fetched.mock.calls.map((call) => `${(call[1] as RequestInit | undefined)?.method} ${String(call[0])}`)

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("the panel's conversation, live", () => {
  it("marks the customer's message read once, and not again when that fails", async () => {
    const fetched = vi.fn(async (url: string) => (url.endsWith("/read") ? new Response("", { status: 502 }) : Response.json(conversationWith(true, 1))))
    vi.stubGlobal("fetch", fetched)

    mount()
    await screen.findByText("Chega sexta?")
    await waitFor(() => expect(pathsOf(fetched)).toContain("POST /api/stores/loja/orders/18/conversation/read"))
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(pathsOf(fetched).filter((path) => path.endsWith("/read"))).toHaveLength(1)
  })

  it("answers, and once the order closed in between, turns to history", async () => {
    const user = userEvent.setup()
    let closed = false
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.endsWith("/messages")) {
          closed = true
          return Response.json({ errorCode: "ORDER_CONVERSATION_CLOSED" }, { status: 409 })
        }
        return Response.json(conversationWith(!closed, 0))
      }),
    )

    mount()
    await user.type(await screen.findByRole("textbox", { name: "Resposta ao cliente" }), "Chega, sim")
    await user.click(screen.getByRole("button", { name: "Enviar" }))

    expect(await screen.findByText(/a conversa agora é só histórico/)).toBeInTheDocument()
    expect(screen.queryByRole("textbox", { name: "Resposta ao cliente" })).toBeNull()
  })
})
