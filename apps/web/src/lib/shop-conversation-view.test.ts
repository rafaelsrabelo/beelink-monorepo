// Libs
import { describe, expect, it } from "vitest"

// Types
import type { ShopConversation, ShopConversationPage } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { shopConversationLinesOf, shopConversationRowsOf, shopConversationStateOf, shopConversationsAddressOf, shopConversationsHrefOf } from "./shop-conversation-view"

const context = { locale: "pt-BR", messages: ptBR }
const at = "2026-09-29T13:00:00.000Z"

describe("the conversations' tab", () => {
  it("reads its state from the address, and writes it back", () => {
    const address = shopConversationsAddressOf(new URLSearchParams("filtro=unread&q=Carla&pedido=18"))
    expect(address).toEqual({ filter: "UNREAD", q: "Carla", order: 18, page: 1 })
    expect(shopConversationsHrefOf("loja", address)).toBe("/admin/loja/conversations?filtro=unread&q=Carla&pedido=18")
    expect(shopConversationsAddressOf(new URLSearchParams("filtro=qualquer&pedido=abc&pagina=x"))).toEqual({ filter: "OPEN", q: "", order: null, page: 1 })
    expect(shopConversationsHrefOf("loja", { filter: "OPEN", q: "", order: null, page: 2 })).toBe("/admin/loja/conversations?pagina=2")
    expect(shopConversationsAddressOf(new URLSearchParams(`q=${"a".repeat(200)}`)).q).toHaveLength(120)
  })

  it("names each row by customer, order and status, the shop's own last line as its own", () => {
    const page = {
      total: 1,
      page: 1,
      pageSize: 20,
      conversations: [{ order: { number: 18, status: "PREPARING", fulfillment: "DELIVERY", open: true }, customer: { id: "c", name: "Carla" }, lastMessage: { kind: "MESSAGE", author: "SHOP", body: "Sai\namanhã", createdAt: at }, unread: 0 }],
    } as unknown as ShopConversationPage

    const [row] = shopConversationRowsOf(page, { filter: "UNREAD", q: "", order: null, page: 1 }, "loja", context)

    expect(row).toMatchObject({ customer: "Carla", order: "Pedido nº 18 · Em preparo", preview: "Você: Sai amanhã", closed: false, href: "/admin/loja/conversations?filtro=unread&pedido=18" })
  })

  it("says sent or read under the shop's last message, and whether it can be answered", () => {
    const conversation = {
      order: { number: 18, status: "PREPARING", fulfillment: "DELIVERY", open: true },
      customer: { id: "c", name: "Carla" },
      unread: 0,
      messages: [
        { kind: "MESSAGE", id: "1", author: "CUSTOMER", body: "Oi", createdAt: at, readAt: at },
        { kind: "MESSAGE", id: "2", author: "SHOP", body: "Olá", createdAt: at, readAt: at },
      ],
    } as ShopConversation

    expect(shopConversationLinesOf(conversation, context).map((line) => [line.mine, line.seen])).toEqual([
      [false, null],
      [true, "Lida"],
    ])
    expect(shopConversationStateOf(conversation)).toBe("open")
    expect(shopConversationStateOf({ ...conversation, order: { ...conversation.order, open: false } })).toBe("closed")
    expect(shopConversationStateOf({ ...conversation, messages: [] })).toBe("empty")
    expect(shopConversationStateOf({ ...conversation, messages: [], order: { ...conversation.order, open: false } })).toBe("none")
  })

  /** BEELINK-236: what the customer was told, in the shop's words; a conversation of notices alone takes the shop's first message. */
  it("draws the order's moves as notices, and a conversation of notices alone can be written in", () => {
    const conversation = {
      order: { number: 18, status: "ACCEPTED", fulfillment: "DELIVERY", open: true },
      customer: { id: "c", name: "Carla" },
      unread: 0,
      messages: [
        { kind: "STATUS", id: "1", status: "RECEIVED", createdAt: at, readAt: at },
        { kind: "STATUS", id: "2", status: "ACCEPTED", createdAt: at, readAt: null },
      ],
    } as ShopConversation

    expect(shopConversationLinesOf(conversation, context).map((line) => [line.notice, line.mine, line.body])).toEqual([
      [true, false, "Pedido recebido"],
      [true, false, "Pedido aceito"],
    ])
    expect(shopConversationStateOf(conversation)).toBe("open")
  })
})
