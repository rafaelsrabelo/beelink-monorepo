// Libs
import { describe, expect, it } from "vitest"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { ShopperConversationError } from "@/services/conversations/conversation-requests"
import { conversationRefusalOf } from "./conversation-refusal"
import { conversationLinesOf, conversationRowsOf, messageLengthOf, noticeWithCashback, unreadOf } from "./conversation-view"
import { storefrontRoutes } from "./storefront-routes"

const routes = storefrontRoutes({
  slug: "loja",
  routeWords: { products: "produtos", categories: "categorias", search: "busca", cart: "carrinho", signIn: "entrar", verifyEmail: "confirmar-email", resetPassword: "nova-senha", account: "conta", accountTabs: { orders: "pedidos", favorites: "favoritos", reviews: "avaliacoes", profile: "perfil", messages: "conversas" } },
})
const context = { locale: "pt-BR", messages: ptBR }

describe("the conversations' rows", () => {
  it("name the order, say who wrote the last line, and mark the ended ones", () => {
    const rows = conversationRowsOf(
      [
        { order: { number: 18, status: "PREPARING", fulfillment: "DELIVERY", open: true }, lastMessage: { kind: "MESSAGE", author: "SHOP", body: "Chega\nsexta", createdAt: "2026-09-29T13:40:00.000Z" }, unread: 2 },
        { order: { number: 13, status: "DELIVERED", fulfillment: "DELIVERY", open: false }, lastMessage: { kind: "MESSAGE", author: "CUSTOMER", body: "Obrigada!", createdAt: "2026-09-20T12:12:00.000Z" }, unread: 0 },
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
        order: { number: 18, status: "PREPARING", fulfillment: "DELIVERY", open: true },
        unread: 0,
        messages: [
          { kind: "MESSAGE", id: "1", author: "CUSTOMER", body: "Oi", createdAt: at, readAt: at },
          { kind: "MESSAGE", id: "2", author: "SHOP", body: "Olá", createdAt: at, readAt: null },
          { kind: "MESSAGE", id: "3", author: "CUSTOMER", body: "Chega sexta?", createdAt: at, readAt: null },
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

  /** BEELINK-236: the order's moves, worded for the shopper; a pick-up's end is "picked up". */
  it("word the order's moves as notices, and keep the sent mark on the shopper's last message", () => {
    const at = "2026-09-29T13:00:00.000Z"
    const lines = conversationLinesOf(
      {
        order: { number: 18, status: "DELIVERED", fulfillment: "PICKUP", open: false },
        unread: 1,
        messages: [
          { kind: "STATUS", id: "1", status: "RECEIVED", cashbackCents: null, createdAt: at, readAt: at },
          { kind: "MESSAGE", id: "2", author: "CUSTOMER", body: "Posso buscar hoje?", createdAt: at, readAt: at },
          { kind: "STATUS", id: "3", status: "DELIVERED", cashbackCents: null, createdAt: at, readAt: null },
        ],
      },
      context,
    )

    expect(lines.map((line) => [line.notice ?? false, line.body, line.seen ?? null])).toEqual([
      [true, "Pedido recebido. A loja vai confirmar em breve.", null],
      [false, "Posso buscar hoje?", "Lida"],
      [true, "Pedido retirado na loja.", null],
    ])
  })

  /** BEELINK-239: a delivery's notice says the cashback it made usable, in the shopper's money. */
  it("tells the cashback a delivery made usable after its notice, and nothing when there was none", () => {
    expect(noticeWithCashback("Pedido entregue.", 504, ptBR.storefront.conversationCashback, "pt-BR").replace(/\s/g, " ")).toBe(
      "Pedido entregue. Você ganhou R$ 5,04 de cashback para usar nas próximas compras.",
    )
    expect(noticeWithCashback("Pedido entregue.", null, ptBR.storefront.conversationCashback, "pt-BR")).toBe("Pedido entregue.")
  })

  it("preview a move as its words, with no 'Você:'", () => {
    const [row] = conversationRowsOf(
      [{ order: { number: 18, status: "OUT_FOR_DELIVERY", fulfillment: "DELIVERY", open: true }, lastMessage: { kind: "STATUS", status: "OUT_FOR_DELIVERY", createdAt: "2026-09-29T13:40:00.000Z" }, unread: 1 }],
      { routes, ...context },
    )

    expect(row).toMatchObject({ preview: "Seu pedido saiu para entrega.", unread: 1 })
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
