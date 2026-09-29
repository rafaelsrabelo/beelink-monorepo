// Libs
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

// Types
import type { CustomerConversation } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { conversationKeys } from "@/services/conversations/conversation-keys"
import { ConversationThreadLive } from "./conversation-thread-live"

const routeWords = { products: "produtos", categories: "categorias", search: "busca", cart: "carrinho", signIn: "entrar", account: "conta", accountTabs: { orders: "pedidos", favorites: "favoritos", reviews: "avaliacoes", profile: "perfil", messages: "conversas" } }
const at = "2026-09-29T13:00:00.000Z"

function conversationWith(unread: number, extra: CustomerConversation["messages"] = []): CustomerConversation {
  return {
    order: { number: 18, status: "PREPARING", open: true },
    unread,
    messages: [{ id: "s1", author: "SHOP", body: "Chega sexta.", createdAt: at, readAt: null }, ...extra],
  }
}

function mount(client = new QueryClient()) {
  render(
    <QueryClientProvider client={client}>
      <ConversationThreadLive slug="loja" routeWords={routeWords} number={18} messages={ptBR} />
    </QueryClientProvider>,
  )
  return client
}

const pathsOf = (fetched: ReturnType<typeof vi.fn>) => fetched.mock.calls.map((call) => `${(call[1] as RequestInit | undefined)?.method} ${String(call[0])}`)

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("one order's conversation, live", () => {
  it("asks once to mark the shop's message read, and not again when that fails", async () => {
    const fetched = vi.fn(async (url: string) => (url.endsWith("/read") ? new Response("", { status: 502 }) : Response.json(conversationWith(1))))
    vi.stubGlobal("fetch", fetched)

    mount()
    await screen.findByText("Chega sexta.")
    await waitFor(() => expect(pathsOf(fetched)).toContain("POST /loja/api/orders/18/conversation/read"))
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(pathsOf(fetched).filter((path) => path.endsWith("/read"))).toHaveLength(1)
  })

  it("keeps the conversation on screen when a later read of it fails", async () => {
    let fail = false
    vi.stubGlobal("fetch", vi.fn(async () => (fail ? new Response("", { status: 502 }) : Response.json(conversationWith(0)))))

    const client = mount()
    await screen.findByText("Chega sexta.")
    fail = true
    await client.invalidateQueries({ queryKey: conversationKeys.shopperOrder("loja", 18) })

    expect(screen.getByText("Chega sexta.")).toBeInTheDocument()
    expect(screen.getByRole("textbox", { name: "Mensagem para a loja" })).toBeInTheDocument()
  })

  it("keeps a refused message in the field, and says why", async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => (url.endsWith("/messages") ? Response.json({ errorCode: "RATE_LIMITED" }, { status: 429 }) : Response.json(conversationWith(0)))),
    )

    mount()
    const field = await screen.findByRole("textbox", { name: "Mensagem para a loja" })
    await user.type(field, "Oi")
    await user.click(screen.getByRole("button", { name: "Enviar" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("Muitas mensagens em pouco tempo")
    expect(field).toHaveValue("Oi")
  })
})
