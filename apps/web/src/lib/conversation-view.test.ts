// Libs
import { describe, expect, it } from "vitest"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { ShopperConversationError } from "@/services/conversations/conversation-requests"
import { conversationRefusalOf } from "./conversation-refusal"
import { conversationLinesOf, conversationRowsOf, messageLengthOf, unreadOf } from "./conversation-view"
import { storefrontRoutes } from "./storefront-routes"

const routes = storefrontRoutes({
  slug: "loja",
  routeWords: { products: "produtos", categories: "categorias", search: "busca", cart: "carrinho", signIn: "entrar", account: "conta", accountTabs: { orders: "pedidos", favorites: "favoritos", reviews: "avaliacoes", profile: "perfil", messages: "conversas" } },
})
const context = { locale: "pt-BR", messages: ptBR }

describe("the conversations' rows", () => {
  it("name the order, say who wrote the last line, and mark the ended ones", () => {
    const rows = conversationRowsOf(
      [
        { order: { number: 18, status: "PREPARING", open: true }, lastMessage: { author: "SHOP", body: "Chega\nsexta", createdAt: "2026-09-29T13:40:00.000Z" }, unread: 2 },
        { order: { number: 13, status: "DELIVERED", open: false }, lastMessage: { author: "CUSTOMER", body: "Obrigada!", createdAt: "2026-09-20T12:12:00.000Z" }, unread: 0 },
      ],
      { routes, ...context },
    )

    expect(rows[0]).toMatchObject({ title: "Pedido nº 18", preview: "Chega sexta", unread: 2, closed: false, href: "/loja/conta/conversas?pedido=18" })
    expect(rows[0]?.when).toContain("10:40")
    expect(rows[1]).toMatchObject({ preview: "Você: Obrigada!", closed: true })
  })
})

describe("a conversation's lines", () => {
  it("say sent or read under the shopper's last message only", () => {
    const at = "2026-09-29T13:00:00.000Z"
    const lines = conversationLinesOf(
      {
        order: { number: 18, status: "PREPARING", open: true },
        unread: 0,
        messages: [
          { id: "1", author: "CUSTOMER", body: "Oi", createdAt: at, readAt: at },
          { id: "2", author: "SHOP", body: "Olá", createdAt: at, readAt: null },
          { id: "3", author: "CUSTOMER", body: "Chega sexta?", createdAt: at, readAt: null },
        ],
      },
      context,
    )

    expect(lines.map((line) => [line.mine, line.seen])).toEqual([
      [true, null],
      [false, null],
      [true, "Enviada"],
    ])
  })
})

describe("the counts and limits", () => {
  it("adds the unread across conversations, and measures a draft as the API does", () => {
    expect(unreadOf(undefined)).toBe(0)
    expect(unreadOf([{ unread: 2 }, { unread: 1 }] as unknown as Parameters<typeof unreadOf>[0])).toBe(3)
    expect(messageLengthOf("  oi  ")).toBe(2)
    expect(messageLengthOf("👍🏽")).toBe(2)
  })

  it("says why a message was not sent", () => {
    const text = ptBR.storefront
    expect(conversationRefusalOf(new ShopperConversationError("ORDER_CONVERSATION_CLOSED", 409), text)).toBe(text.conversationRefusedClosed)
    expect(conversationRefusalOf(new ShopperConversationError("RATE_LIMITED", 429), text)).toBe(text.conversationRefusedRate)
    expect(conversationRefusalOf(new ShopperConversationError("AUTH_UNAUTHENTICATED", 401), text)).toBe(text.conversationRefusedSignedOut)
    expect(conversationRefusalOf(new Error("x"), text)).toBe(text.conversationRefusedUnknown)
  })
})
