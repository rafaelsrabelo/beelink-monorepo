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
import { orderActionOf } from "@/lib/order-card-view"
import { fullMomentOf, orderHandoverOf, orderHistoryOf, orderItemsOf, orderPaymentOf, orderPlacedLineOf, orderStatusViewOf, orderTrackingOf } from "@/lib/order-page-view"
import { reorderActionOf } from "@/lib/reorder-view"
import { shopperAt } from "@/lib/shopper"
import { navigationAt, shopAt } from "@/lib/storefront-data"
import { accountOrderNumberOf, paramOf, RECEIPT_KEY, sectionOf, storefrontRoutes } from "@/lib/storefront-routes"
import type { SectionQuery } from "@/lib/storefront-section"
import { OrderCancelLive } from "./order-cancel-live"
import { OrderCancelNotice } from "./order-cancel-notice"
import { OrderCancelNoticeLine } from "./order-cancel-notice-line"

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
 * One of the shopper's orders (6e, 6f), or its receipt at the same address with `comprovante=1`.
 * The order is read before anything is drawn, as a product is: none by that number, or another
 * customer's, is a real 404 rather than a not-found drawn inside a page already sent as found.
 */
export async function OrderPage({ query, ...params }: OrderPageProps) {
  const loaded = await load(params)
  if (!loaded) notFound()

  const { store, number } = loaded
  const routes = storefrontRoutes(store)
  const receipt = paramOf(query[RECEIPT_KEY]) === "1"
  const here = routes.accountOrder(number, { receipt })
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
          // Each action joins with its ticket: talking to the shop (K3). Buying again sits under the lines.
          actions: orderActionOf(order.status) === "cancel" ? <OrderCancelLive slug={store.slug} number={order.number} messages={ui} /> : undefined,
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
            <StorefrontOrderPayment {...payment} messages={ui} />
            {handover ? <StorefrontOrderAddress {...handover} /> : null}
          </>
        }
      />
    </OrderCancelNotice>,
  )
}
