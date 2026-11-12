// Types
import type { AffiliateHome, AffiliateOrder, AffiliateProductLink, AffiliateReceivedPayout, AffiliateShop } from "@harness-monorepo/contracts"
import type { AffiliateHomeView, AffiliateOrderView, AffiliatePayoutView, AffiliateProductLinkView, AffiliateShopCardView } from "@harness-monorepo/ui/lib/affiliate-area"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"
import type { AffiliateAreaTab } from "@harness-monorepo/ui/blocks/affiliate-area/affiliate-area-tabs"

// UI
import { ratePercentOf } from "@harness-monorepo/ui/lib/cashback"
import { format } from "@harness-monorepo/ui/locales/index"

// App
import { signedMoneyOf, type MoneyWords } from "./affiliate-money-view"

type Text = UiMessages["affiliateArea"]

/** How the area says things: the money and calendar words, the locale for rates, and the site's origin for links. */
export interface AreaWords extends MoneyWords {
  locale: string
  origin: string
}

/** Each section's word in the address (`?aba=`), as the product speaks: the payout's e-mail links to `extrato`. The front page has none. */
const TAB_WORDS: Record<AffiliateAreaTab, string> = { home: "", products: "produtos", orders: "vendas", statement: "extrato", profile: "dados" }

/** The address of one shop's page in the area, and of one of its sections. */
export function affiliateShopHrefOf(storeSlug: string, tab: AffiliateAreaTab = "home"): string {
  const base = `/afiliado/${encodeURIComponent(storeSlug)}`
  return TAB_WORDS[tab] ? `${base}?aba=${TAB_WORDS[tab]}` : base
}

/** The section an address asks for; a word that names none is the front page. */
export function areaTabOf(word: string | undefined): AffiliateAreaTab {
  const found = (Object.entries(TAB_WORDS) as [AffiliateAreaTab, string][]).find(([, each]) => each !== "" && each === word)
  return found ? found[0] : "home"
}

export function shopCardOf(shop: AffiliateShop, money: (cents: number) => string): AffiliateShopCardView {
  return {
    key: shop.store.slug,
    name: shop.store.name,
    logoUrl: shop.store.logoUrl,
    href: affiliateShopHrefOf(shop.store.slug),
    status: shop.status,
    available: shop.availableCents < 0 ? signedMoneyOf(shop.availableCents, money) : money(shop.availableCents),
    pending: money(shop.pendingCents),
    negative: shop.availableCents < 0,
  }
}

/** Why the link credits no one now, said on the front page: ended, paused, or the shop's programme off. */
function noticeOf(home: AffiliateHome, text: Text["home"]): string | null {
  if (home.affiliate.status === "ENDED") return text.ended
  if (home.affiliate.status === "PAUSED") return text.paused
  return home.linksCredit ? null : text.notCrediting
}

export function homeViewOf(home: AffiliateHome, words: AreaWords, text: Text["home"]): AffiliateHomeView {
  const { money } = words
  const next = home.payment.next
  return {
    available: home.availableCents < 0 ? signedMoneyOf(home.availableCents, money) : money(home.availableCents),
    pending: money(home.pendingCents),
    negativeNotice: home.availableCents < 0 ? format(text.negative, { amount: money(-home.availableCents) }) : null,
    next: next ? format(text.nextOn, { date: words.day(next.dueOn), amount: money(next.amountCents) }) : null,
    link: home.linkPath ? `${words.origin}${home.linkPath}` : null,
    table: format(text.table, { table: home.affiliate.table.name, rate: ratePercentOf(home.affiliate.table.defaultRateBps, words.locale) }),
    notice: noticeOf(home, text),
    numbers: {
      title: format(text.numbers, { days: String(home.numbers.days) }),
      visits: String(home.numbers.visits),
      orders: String(home.numbers.orders),
      sales: String(home.numbers.sales),
      commission: money(home.numbers.commissionCents),
    },
  }
}

export function productLinkViewOf(product: AffiliateProductLink, words: AreaWords, text: Text["products"]): AffiliateProductLinkView {
  return {
    id: product.productId,
    name: product.name,
    imageUrl: product.imageUrl,
    price: words.money(product.priceCents),
    rate: format(text.rate, { rate: ratePercentOf(product.rateBps, words.locale) }),
    url: `${words.origin}${product.path}`,
  }
}

/** An order the affiliate reads: its own status in the shop's words, and where its commission stands. */
export function orderViewOf(order: AffiliateOrder, words: AreaWords, text: Text["orders"], statuses: UiMessages["orders"]["statuses"]): AffiliateOrderView {
  const { commission } = order
  const state =
    commission.zeroReason === "OWN_PURCHASE"
      ? text.ownPurchase
      : commission.status === "PENDING"
        ? commission.dueOn
          ? format(text.dueOn, { date: words.day(commission.dueOn) })
          : text.awaitingDelivery
        : text.states[commission.status]
  return {
    key: String(order.number),
    number: format(text.number, { number: String(order.number) }),
    date: words.date(order.placedAt),
    status: statuses[order.status],
    customer: order.customerName,
    items: order.items.map((item) => `${item.quantity}× ${item.name}${item.variantLabel ? ` (${item.variantLabel})` : ""}`),
    commission: words.money(commission.commissionCents),
    base: format(text.base, { amount: words.money(commission.baseCents) }),
    state,
    void: commission.status === "REVERSED",
  }
}

export function payoutViewOf(payout: AffiliateReceivedPayout, words: MoneyWords, methods: UiMessages["affiliates"]["money"]["methods"]): AffiliatePayoutView {
  return { id: payout.id, amount: words.money(payout.amountCents), detail: `${words.day(payout.paidOn)} · ${methods[payout.method]}`, note: payout.note }
}
