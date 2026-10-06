// Libs
import { describe, expect, it } from "vitest"

// Types
import type { CustomerOrder } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { fullMomentOf, orderHandoverOf, orderHistoryOf, orderItemsOf, orderPaymentOf, orderPlacedLineOf, orderStatusViewOf, orderTrackingOf } from "./order-page-view"
import { storefrontRoutes } from "./storefront-routes"

const routes = storefrontRoutes({
  slug: "loja",
  routeWords: {
    products: "produtos",
    categories: "categorias",
    search: "busca",
    cart: "carrinho",
    signIn: "entrar", verifyEmail: "confirmar-email", resetPassword: "nova-senha",
    account: "conta",
    accountTabs: { orders: "pedidos", favorites: "favoritos", reviews: "avaliacoes", cashback: "cashback", profile: "perfil", messages: "conversas" },
  },
})
const context = { routes, locale: "pt-BR", messages: ptBR }
const shop = { name: "Loja do Design" }

const order: CustomerOrder = {
  number: 14,
  status: "PREPARING",
  placedBy: "CUSTOMER",
  cancelledBy: null,
  fulfillment: "DELIVERY",
  deliveryAddress: { recipientName: "Marina Souza", zipCode: "60160230", street: "Rua Tibúrcio Cavalcante", number: "1200", complement: "apto 302", neighborhood: "Meireles", city: "Fortaleza", state: "CE" },
  paymentMethod: "PIX",
  paymentChannel: "OFFLINE",
  installments: 1,
  payment: null,
  items: [
    { productId: "p1", productSlug: "molotov", productName: "Molotov 300g", variantLabel: "Sabor: Uva", imageUrl: null, unitPriceCents: 3990, quantity: 2, lineTotalCents: 7980, discountCents: 0, promotionName: null },
    { productId: null, productSlug: null, productName: "Boné", variantLabel: null, imageUrl: null, unitPriceCents: 2000, quantity: 1, lineTotalCents: 2000, discountCents: 0, promotionName: null },
  ],
  subtotalCents: 9980,
  deliveryFeeCents: 0,
  discountCents: 500,
  promotionDiscountCents: 0,
  couponDiscountCents: 0,
  coupon: null,
  cashback: null,
  cashbackUsedCents: 0,
  totalCents: 9480,
  placedAt: "2026-09-28T17:02:00.000Z",
  events: [
    { status: "RECEIVED", at: "2026-09-28T17:02:00.000Z" },
    { status: "ACCEPTED", at: "2026-09-28T18:10:00.000Z" },
    { status: "PREPARING", at: "2026-09-29T12:00:00.000Z" },
  ],
  delivery: null,
  deliveryWindow: null,
}

describe("an order's page, in the shopper's words", () => {
  it("says who placed it and when, with the year, on Brasília's clock", () => {
    expect(fullMomentOf("2026-09-28T17:02:00.000Z", "pt-BR")).toBe("28 de set. de 2026, 14:02")
    expect(orderPlacedLineOf(order, context)).toBe("Feito por você na loja em 28 de set. de 2026, 14:02.")
    expect(orderPlacedLineOf({ ...order, placedBy: "SHOP" }, context)).toBe("Lançado pela loja em 28 de set. de 2026, 14:02.")
  })

  it("tells where it stands and when it last moved, with its steps", () => {
    const status = orderStatusViewOf(order, context)

    expect(status).toMatchObject({ headline: "Em preparo", detail: "Atualizado em 29 de set., 09:00", tone: "progress" })
    expect(status.steps?.map((step) => step.state)).toEqual(["done", "done", "current", "todo", "todo"])
    // Received is the placing itself: what it waits for, rather than when.
    expect(orderStatusViewOf({ ...order, status: "RECEIVED", events: order.events.slice(0, 1) }, context).detail).toBe("A loja confirma o pedido e o prazo.")
  })

  it("tells a cancelled order by when and by whom, without steps", () => {
    const cancelled = { ...order, status: "CANCELLED" as const, cancelledBy: "SHOP" as const, events: [...order.events, { status: "CANCELLED" as const, at: "2026-09-29T13:00:00.000Z" }] }

    expect(orderStatusViewOf(cancelled, context)).toEqual({ headline: "Cancelado em 29 de set. de 2026", detail: "Cancelado pela loja", tone: "cancelled", steps: null })
  })

  it("lists the history newest first, the placing saying by whom and a cancel by whom", () => {
    const cancelled = { ...order, status: "CANCELLED" as const, cancelledBy: "CUSTOMER" as const, events: [order.events[0]!, { status: "CANCELLED" as const, at: "2026-09-28T18:00:00.000Z" }] }

    expect(orderHistoryOf(cancelled, context)).toEqual([
      { day: "28 de set.", time: "15:00", title: "Pedido cancelado", detail: "Por você" },
      { day: "28 de set.", time: "14:02", title: "Pedido feito", detail: "Feito por você na loja" },
    ])
  })

  /** The panel sets any status: on a pick-up, "out for delivery" can only mean ready to be taken. */
  it("names a pick-up's steps as a pick-up", () => {
    const pickup = { ...order, fulfillment: "PICKUP" as const, placedBy: "SHOP" as const, events: [{ status: "ACCEPTED" as const, at: order.placedAt }, { status: "OUT_FOR_DELIVERY" as const, at: "2026-09-29T12:00:00.000Z" }, { status: "DELIVERED" as const, at: "2026-09-29T15:00:00.000Z" }] }

    expect(orderHistoryOf(pickup, context).map((event) => [event.title, event.detail])).toEqual([
      ["Retirado na loja", null],
      ["Pronto para retirar", null],
      ["Loja confirmou", "Lançado pela loja"],
    ])
  })

  it("says a pick-up is ready to be taken, then taken, where a delivery goes out and arrives", () => {
    const events = [...order.events, { status: "OUT_FOR_DELIVERY" as const, at: "2026-09-29T13:00:00.000Z" }]
    expect(orderStatusViewOf({ ...order, fulfillment: "PICKUP", status: "OUT_FOR_DELIVERY", events }, context).headline).toBe("Pronto para retirar")
    expect(orderStatusViewOf({ ...order, status: "OUT_FOR_DELIVERY", events }, context).headline).toBe("Saiu para entrega")

    const delivered = [...events, { status: "DELIVERED" as const, at: "2026-09-29T15:00:00.000Z" }]
    expect(orderStatusViewOf({ ...order, fulfillment: "PICKUP", status: "DELIVERED", events: delivered }, context).headline).toBe("Retirado em 29 de set. de 2026")
    expect(orderStatusViewOf({ ...order, status: "DELIVERED", events: delivered }, context).headline).toBe("Entregue em 29 de set. de 2026")
  })

  /** Placed once: the shop sending it back to waiting is not a second placing. */
  it("names a later return to received by its status, not as the placing again", () => {
    const back = { ...order, status: "RECEIVED" as const, events: [order.events[0]!, order.events[1]!, { status: "RECEIVED" as const, at: "2026-09-29T10:00:00.000Z" }] }

    expect(orderHistoryOf(back, context).map((event) => event.title)).toEqual(["Aguardando a loja confirmar", "Loja confirmou", "Pedido feito"])
  })

  it("prices each line as it was bought, and counts the units", () => {
    const { items, count } = orderItemsOf(order, context)

    expect(count).toBe(3)
    expect(items[0]).toMatchObject({ name: "Molotov 300g", href: "/loja/produtos/molotov", price: expect.stringMatching(/^R\$\s79,80$/) })
    expect(items[0]!.meta).toMatch(/^Sabor: Uva · Qtd\. 2 · R\$\s39,90 cada$/)
    expect(items[1]).toMatchObject({ href: null, meta: "Qtd. 1" })
  })

  it("leads a delivered order's lines still on sale to their rating, and nothing before delivery", () => {
    expect(orderItemsOf({ ...order, status: "DELIVERED" }, context).items.map((item) => item.reviewHref)).toEqual(["/loja/conta/avaliacoes?produto=p1#avaliar-p1", null])
    expect(orderItemsOf({ ...order, status: "OUT_FOR_DELIVERY" }, context).items.every((item) => item.reviewHref === null)).toBe(true)
  })

  it("adds the sums that apply, and says the way of paying agreed — never approved", () => {
    const payment = orderPaymentOf(order, context)

    expect(payment.rows.map((row) => [row.label, row.value.replace(/\s/g, " ")])).toEqual([
      ["Subtotal", "R$ 99,80"],
      ["Entrega", "Grátis"],
      ["Desconto", "− R$ 5,00"],
    ])
    expect(payment.total.replace(/\s/g, " ")).toBe("R$ 94,80")
    expect(payment.method).toBe("Pagamento combinado com a loja: Pix")
    // A pick-up has no delivery to add, and no discount is no line.
    expect(orderPaymentOf({ ...order, fulfillment: "PICKUP", discountCents: 0 }, context).rows.map((row) => row.label)).toEqual(["Subtotal"])
  })

  /** BEELINK-244: the credit spent is the last row, apart from the discounts — on the page and on the receipt, which read these rows. */
  it("says the cashback used on a row of its own, after what came off", () => {
    const paid: CustomerOrder = { ...order, deliveryFeeCents: 1000, discountCents: 500, promotionDiscountCents: 0, couponDiscountCents: 0, coupon: null, cashbackUsedCents: 1500, totalCents: 8980 }

    expect(orderPaymentOf(paid, context).rows.map((row) => [row.label, row.value.replace(/\s/g, " ")])).toEqual([
      ["Subtotal", "R$ 99,80"],
      ["Entrega", "R$ 10,00"],
      ["Desconto", "− R$ 5,00"],
      ["Cashback usado", "− R$ 15,00"],
    ])
    expect(orderPaymentOf({ ...paid, cashbackUsedCents: 0 }, context).rows.map((row) => row.label)).not.toContain("Cashback usado")
  })

  /** BEELINK-194: what came off is told part by part, the coupon by its code — on the page and on the receipt, which read these rows. */
  it("breaks the discount into the promotion, the coupon and what the shop took off, and names the line the promotion reached", () => {
    const discounted: CustomerOrder = {
      ...order,
      items: [{ ...order.items[0]!, discountCents: 798, promotionName: "Semana do Whey" }, order.items[1]!],
      deliveryFeeCents: 1000,
      discountCents: 2216,
      promotionDiscountCents: 798,
      couponDiscountCents: 918,
      coupon: { code: "BEMVINDO10", kind: "PERCENT" },
      totalCents: 8764,
    }

    expect(orderPaymentOf(discounted, context).rows.map((row) => [row.label, row.value.replace(/\s/g, " "), row.positive ?? false])).toEqual([
      ["Subtotal", "R$ 99,80", false],
      ["Entrega", "R$ 10,00", false],
      ["Promoção: Semana do Whey", "− R$ 7,98", true],
      ["Cupom BEMVINDO10", "− R$ 9,18", true],
      ["Desconto", "− R$ 5,00", true],
    ])
    const { items } = orderItemsOf(discounted, context)
    // The line keeps the catalogue's price — the subtotal adds those up — and says what came off it.
    expect(items[0]!.price.replace(/\s/g, " ")).toBe("R$ 79,80")
    expect(items[0]!.meta.replace(/\s/g, " ")).toBe("Sabor: Uva · Qtd. 2 · R$ 39,90 cada · Promoção: Semana do Whey (− R$ 7,98)")
    expect(items[1]!.meta).toBe("Qtd. 1")
  })

  it("says a free delivery coupon in words while its fee is not agreed, and a total with no '+ frete'", () => {
    const free = orderPaymentOf({ ...order, deliveryFeeCents: null, discountCents: 0, coupon: { code: "FRETEGRATIS", kind: "FREE_SHIPPING" }, totalCents: 9980 }, context)

    expect(free.rows.map((row) => [row.label, row.value])).toEqual([
      ["Subtotal", expect.stringMatching(/99,80/)],
      ["Entrega", "A combinar"],
      ["Cupom FRETEGRATIS", "Frete grátis"],
    ])
    expect(free.total.replace(/\s/g, " ")).toBe("R$ 99,80")
  })

  /** BEELINK-170: a fee not agreed is "a combinar", never "Grátis", and the total says it leaves the fee out. */
  it("says a delivery's fee is to be agreed, and the total '+ frete', while the shop has not told it", () => {
    const payment = orderPaymentOf({ ...order, deliveryFeeCents: null }, context)

    expect(payment.rows.find((row) => row.label === "Entrega")).toMatchObject({ value: "A combinar" })
    expect(payment.rows.find((row) => row.label === "Entrega")).not.toHaveProperty("positive")
    expect(payment.total.replace(/\s/g, " ")).toBe("R$ 94,80 + frete")
  })

  it("leaves the fee out of a cancelled order that never agreed one: there is nothing left to agree", () => {
    const payment = orderPaymentOf({ ...order, status: "CANCELLED", cancelledBy: "CUSTOMER", deliveryFeeCents: null }, context)

    expect(payment.rows.find((row) => row.label === "Entrega")).toBeUndefined()
    expect(payment.total).not.toContain("frete")
  })

  it("says where it goes, or the shop it is picked up at", () => {
    expect(orderHandoverOf(order, shop, context)).toEqual({
      title: "Endereço de entrega",
      lines: ["Marina Souza", "Rua Tibúrcio Cavalcante, 1200, apto 302", "Meireles — Fortaleza/CE — CEP 60160-230"],
    })
    expect(orderHandoverOf({ ...order, fulfillment: "PICKUP", deliveryAddress: null }, shop, context)).toEqual({ title: "Retirada na loja", lines: ["Loja do Design"] })
    expect(orderHandoverOf({ ...order, deliveryAddress: null }, shop, context)).toBeNull()
  })

  /** BEELINK-178: the window the checkout promised stays with where the order goes. */
  it("says the window the checkout quoted, under the address", () => {
    expect(orderHandoverOf({ ...order, deliveryWindow: { unit: "MINUTES", from: 30, to: 50 } }, shop, context)?.lines.at(-1)).toBe("Chega em 30–50 min depois de sair da loja")
    // A carrier's (BEELINK-186) counts business days, and from the posting rather than from the shop's door.
    expect(orderHandoverOf({ ...order, deliveryWindow: { unit: "BUSINESS_DAYS", from: 3, to: 4 } }, shop, context)?.lines.at(-1)).toBe("Prazo de entrega cotado: 3–4 dias úteis")
  })

  it("says the window it should arrive in once the shop told it, and how it comes", () => {
    const delivery = { kind: "CARRIER" as const, carrier: "Correios", service: "SEDEX", trackingCode: "AB123456789BR", trackingUrl: "https://rastreamento.correios.com.br/app/index.php", estimateFrom: "2026-09-30", estimateTo: "2026-10-02" }
    const told = { ...order, delivery }

    expect(orderStatusViewOf(told, context).detail).toBe("Chega entre qua., 30 de set. e sex., 2 de out.")
    expect(orderTrackingOf(told, context)).toEqual({ by: "Correios · SEDEX", code: "AB123456789BR", href: "https://rastreamento.correios.com.br/app/index.php", hrefLabel: "Ver no site da transportadora" })
    expect(orderTrackingOf({ ...told, delivery: { ...delivery, kind: "OWN", carrier: null, service: null, trackingUrl: "https://loja.com/1" } }, context)).toMatchObject({ by: "Entrega da própria loja", hrefLabel: "Acompanhar a entrega" })
  })

  it("draws no tracking with nothing to follow, nor on a cancelled order", () => {
    const own = { kind: "OWN" as const, carrier: null, service: null, trackingCode: null, trackingUrl: null, estimateFrom: "2026-09-30", estimateTo: "2026-09-30" }
    expect(orderTrackingOf({ ...order, delivery: own }, context)).toBeNull()
    expect(orderTrackingOf({ ...order, status: "CANCELLED", delivery: { ...own, trackingCode: "X1" } }, context)).toBeNull()
    expect(orderTrackingOf(order, context)).toBeNull()
  })
})
