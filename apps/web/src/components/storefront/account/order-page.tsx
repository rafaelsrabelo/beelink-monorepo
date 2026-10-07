// React
import type { ReactNode } from "react"

// Next
import { notFound, redirect } from "next/navigation"
import type { Metadata } from "next"

// UI
import { StorefrontOrderAddress } from "@harness-monorepo/ui/blocks/storefront/storefront-order-address"
import { StorefrontOrderHeader } from "@harness-monorepo/ui/blocks/storefront/storefront-order-header"
import { StorefrontOrderHistory } from "@harness-monorepo/ui/blocks/storefront/storefront-order-history"
import { StorefrontOrderItems } from "@harness-monorepo/ui/blocks/storefront/storefront-order-items"
import { StorefrontOrderLayout } from "@harness-monorepo/ui/blocks/storefront/storefront-order-layout"
import { StorefrontOrderPayment } from "@harness-monorepo/ui/blocks/storefront/storefront-order-payment"
import { StorefrontOrderReceipt } from "@harness-monorepo/ui/blocks/storefront/storefront-order-receipt"
import { StorefrontOrderStatus } from "@harness-monorepo/ui/blocks/storefront/storefront-order-status"
import { StorefrontOrderTracking } from "@harness-monorepo/ui/blocks/storefront/storefront-order-tracking"
import { StorefrontOrdersEmpty } from "@harness-monorepo/ui/blocks/storefront/storefront-orders-empty"
import { StorefrontReorderButton } from "@harness-monorepo/ui/blocks/storefront/storefront-reorder-button"
import { format } from "@harness-monorepo/ui/locales/index"

// App
import { AppLink } from "@/components/app-link"
import { StorefrontFrame } from "@/components/storefront/storefront-frame"
import { customerOrderAt } from "@/lib/customer-orders"
import { getMessages } from "@/lib/locale"
import { isOrderInProgress, orderActionOf } from "@/lib/order-card-view"
import { holdsMoney, orderPaymentLabelOf } from "@/lib/order-payment-label"
import { purchaseOf, purchaseOrderOf } from "@/lib/purchase"
import { fullMomentOf, orderHandoverOf, orderHistoryOf, orderItemsOf, orderPaymentOf, orderPlacedLineOf, orderStatusViewOf, orderTrackingOf } from "@/lib/order-page-view"
import { reorderActionOf } from "@/lib/reorder-view"
import { shopperAt } from "@/lib/shopper"
import { navigationAt, shopAt } from "@/lib/storefront-data"
import { accountOrderNumberOf, BACK_KEY, paramOf, PAYMENT_KEY, RECEIPT_KEY, sectionOf, storefrontRoutes } from "@/lib/storefront-routes"
import type { SectionQuery } from "@/lib/storefront-section"
import { OrderTalkLive } from "../conversations/order-talk-live"
import { PurchaseTold } from "../tracking/purchase-told"
import { OrderCancelLive } from "./order-cancel-live"
import { OrderCancelNotice } from "./order-cancel-notice"
import { OrderCancelNoticeLine } from "./order-cancel-notice-line"
import { OrderPaymentLive } from "./order-payment-live"
import { OrderPaymentWatch } from "./order-payment-watch"

export interface OrderPageProps {
  slug: string
  section: string
  item: string
  sub: string
  query: SectionQuery
}

/** The shop and the order a four-segment address names — the account, its orders word, a number — or null, a 404. */
async function load({ slug, section, item, sub }: Omit<OrderPageProps, "query">) {
  const store = await shopAt(slug)
  if (!store || sectionOf(section, store.routeWords).kind !== "account") return null

  const number = accountOrderNumberOf(item, sub, store.routeWords)
  return number === null ? null : { store, number }
}

export async function orderPageMetadata(params: Omit<OrderPageProps, "query">): Promise<Metadata> {
  const loaded = await load(params)
  if (!loaded) return {}

  const { ui } = await getMessages()
  return {
    title: `${format(ui.storefront.orderNumber, { number: String(loaded.number) })} · ${loaded.store.name}`,
    // The shopper's own order is nobody's search result, and nothing on it is worth following.
    robots: { index: false, follow: false },
  }
}

/**
 * One of the shopper's orders (6e, 6f), its receipt at the same address with `comprovante=1`, or the
 * screen it is paid on with `pagamento=1` (BEELINK-205) — for an order charged online alone.
 * The order is read before anything is drawn, as a product is: none by that number, or another
 * customer's, is a real 404 rather than a not-found drawn inside a page already sent as found.
 */
export async function OrderPage({ query, ...params }: OrderPageProps) {
  const loaded = await load(params)
  if (!loaded) notFound()

  const { store, number } = loaded
  const routes = storefrontRoutes(store)
  const receipt = paramOf(query[RECEIPT_KEY]) === "1"
  const paying = !receipt && paramOf(query[PAYMENT_KEY]) === "1"
  const here = routes.accountOrder(number, { receipt, payment: paying })
  const shopper = await shopperAt(params.slug)
  // Theirs alone: a visitor signs in and comes back to this very order.
  if (!shopper) redirect(routes.signIn({ back: here }) as Parameters<typeof redirect>[0])

  const [{ ui }, { categories, onSale }, read] = await Promise.all([getMessages(), navigationAt(params.slug), customerOrderAt(params.slug, number)])
  if (read.status === "missing") notFound()

  const frame = (children: ReactNode, chrome = true) => (
    <StorefrontFrame store={store} categories={categories} activeCategory={null} catalogActive={false} markedCategory={null} onSale={onSale} year={new Date().getFullYear()} shopper={shopper} chrome={chrome} messages={ui}>
      {children}
    </StorefrontFrame>
  )

  const header = (extra: Partial<Parameters<typeof StorefrontOrderHeader>[0]> = {}) => (
    <StorefrontOrderHeader
      number={number}
      trail={[
        { label: ui.storefront.account, href: routes.account() },
        { label: ui.storefront.accountOrders, href: routes.accountTab("orders") },
      ]}
      homeHref={routes.home}
      backHref={routes.accountTab("orders")}
      linkComponent={AppLink}
      messages={ui}
      {...extra}
    />
  )

  if (read.status === "failed") {
    return frame(
      <div className="flex flex-col gap-5 py-4 shop-lg:py-6">
        {header()}
        <StorefrontOrdersEmpty variant="orderUnavailable" href={here} linkComponent={AppLink} messages={ui} />
      </div>,
    )
  }

  const { order } = read
  const context = { routes, locale: "pt-BR", messages: ui }
  const shop = { name: store.name }
  const status = orderStatusViewOf(order, context)
  const tracking = orderTrackingOf(order, context)
  const cancelled = order.status === "CANCELLED"
  const handover = orderHandoverOf(order, shop, context)
  const { items, count } = orderItemsOf(order, context)
  const payment = orderPaymentOf(order, context)
  const facts = { cancelled, awaitingTotal: order.fulfillment === "DELIVERY" && order.deliveryFeeCents === null }

  if (paying) {
    // An order settled with the shop has no payment screen: its page says how it was agreed.
    if (order.paymentChannel !== "ONLINE") redirect(routes.accountOrder(number) as Parameters<typeof redirect>[0])
    const profileHref = `${routes.accountTab("profile")}?${BACK_KEY}=${encodeURIComponent(here)}`
    return frame(<OrderPaymentLive slug={store.slug} number={order.number} orderHref={routes.accountOrder(number)} profileHref={profileHref} order={facts} sale={purchaseOrderOf(order)} locale={context.locale} messages={ui} />)
  }

  if (receipt) {
    return frame(
      <StorefrontOrderReceipt
        shop={shop}
        number={order.number}
        placedOn={fullMomentOf(order.placedAt, context.locale)}
        customer={shopper.name}
        handover={handover}
        items={items}
        {...payment}
        // A cancelled order printed plain would read as a sale that happened.
        note={cancelled ? [status.headline, status.detail].filter(Boolean).join(" · ") : null}
        backHref={routes.accountOrder(order.number)}
        linkComponent={AppLink}
        messages={ui}
      />,
      false,
    )
  }

  return frame(
    <OrderCancelNotice>
      <StorefrontOrderLayout
        header={header({
          placed: orderPlacedLineOf(order, context),
          receiptHref: cancelled ? undefined : routes.accountOrder(order.number, { receipt: true }),
          // Talking to the shop while it is on its way (K3), and the cancel while received. Buying again sits under the lines.
          actions: isOrderInProgress(order.status) ? (
            <>
              <OrderTalkLive number={order.number} href={routes.accountConversation(order.number)} messages={ui} />
              {orderActionOf(order.status, order.payment) === "cancel" ? <OrderCancelLive slug={store.slug} number={order.number} messages={ui} /> : null}
              {/* Paid, and so not theirs to cancel (BEELINK-208): the shop is who gives the money back. */}
              {order.status === "RECEIVED" && holdsMoney(order.payment) ? <p className="basis-full text-[13px] text-shop-muted">{ui.storefront.orderCancelPaidHint}</p> : null}
            </>
          ) : undefined,
        })}
        status={
          <>
            <OrderCancelNoticeLine messages={ui} />
            <StorefrontOrderStatus {...status} tracking={tracking ? <StorefrontOrderTracking {...tracking} messages={ui} /> : undefined} messages={ui} />
          </>
        }
        history={<StorefrontOrderHistory events={orderHistoryOf(order, context)} messages={ui} />}
        aside={
          <>
            <StorefrontOrderItems
              items={items}
              count={count}
              actions={orderActionOf(order.status) === "reorder" ? <StorefrontReorderButton action={reorderActionOf(store.slug, order.number)} variant="all" messages={ui} /> : undefined}
              linkComponent={AppLink}
              messages={ui}
            />
            <StorefrontOrderPayment {...payment} linkComponent={AppLink} messages={ui} />
            {/* While it waits for money, the page follows the charge and is read again when it is paid. */}
            {orderPaymentLabelOf(order, ui.storefront, new Date())?.tone === "wait" ? <OrderPaymentWatch slug={store.slug} number={order.number} status={order.payment?.status ?? null} order={facts} /> : null}
            {handover ? <StorefrontOrderAddress {...handover} /> : null}
            {/* The order as a purchase (BEELINK-273), by this server's clock: told once, to a buyer who said yes, and only in the day after it counted. */}
            <PurchaseTold slug={store.slug} purchase={purchaseOf(purchaseOrderOf(order), new Date())} />
          </>
        }
      />
    </OrderCancelNotice>,
  )
}
