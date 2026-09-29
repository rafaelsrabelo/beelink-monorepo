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
    expect(address).toEqual({ filter: "UNREAD", q: "Carla", order: 18 })
    expect(shopConversationsHrefOf("loja", address)).toBe("/admin/loja/conversations?filtro=unread&q=Carla&pedido=18")
    expect(shopConversationsAddressOf(new URLSearchParams("filtro=qualquer&pedido=abc"))).toEqual({ filter: "OPEN", q: "", order: null })
    expect(shopConversationsHrefOf("loja", { filter: "OPEN", q: "", order: null })).toBe("/admin/loja/conversations")
  })

  it("names each row by customer, order and status, the shop's own last line as its own", () => {
    const page = {
      total: 1,
      page: 1,
      pageSize: 20,
      conversations: [{ order: { number: 18, status: "PREPARING", open: true }, customer: { id: "c", name: "Carla" }, lastMessage: { author: "SHOP", body: "Sai\namanhã", createdAt: at }, unread: 0 }],
    } as unknown as ShopConversationPage

    const [row] = shopConversationRowsOf(page, { filter: "UNREAD", q: "", order: null }, "loja", context)

    expect(row).toMatchObject({ customer: "Carla", order: "Pedido nº 18 · Em preparo", preview: "Você: Sai amanhã", closed: false, href: "/admin/loja/conversations?filtro=unread&pedido=18" })
  })

  it("says sent or read under the shop's last message, and whether it can be answered", () => {
    const conversation = {
      order: { number: 18, status: "PREPARING", open: true },
      customer: { id: "c", name: "Carla" },
      unread: 0,
      messages: [
        { id: "1", author: "CUSTOMER", body: "Oi", createdAt: at, readAt: at },
        { id: "2", author: "SHOP", body: "Olá", createdAt: at, readAt: at },
      ],
    } as ShopConversation

    expect(shopConversationLinesOf(conversation, context).map((line) => [line.mine, line.seen])).toEqual([
      [false, null],
      [true, "Lida"],
    ])
    expect(shopConversationStateOf(conversation)).toBe("open")
    expect(shopConversationStateOf({ ...conversation, order: { ...conversation.order, open: false } })).toBe("closed")
    expect(shopConversationStateOf({ ...conversation, messages: [] })).toBe("empty")
  })
})
