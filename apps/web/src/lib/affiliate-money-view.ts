// Types
import type { AffiliateOwed, AffiliateOwedDay, AffiliateStatement, AffiliateStatementEntry, OrderAffiliate } from "@harness-monorepo/contracts"
import type { AffiliateBalanceView, AffiliateOwedDayView, AffiliateOwedView, AffiliateStatementRowView, OrderAffiliateView } from "@harness-monorepo/ui/lib/affiliate-money"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { format } from "@harness-monorepo/ui/locales/index"

type Text = UiMessages["affiliates"]

/** How a screen says amounts and days: money from cents, a calendar day (`YYYY-MM-DD`) and an instant (ISO). */
export interface MoneyWords {
  money: (cents: number) => string
  day: (day: string) => string
  date: (iso: string) => string
}

/** "+R$ 10,00" and "−R$ 2,50": a statement's line says which way it went. */
export function signedMoneyOf(cents: number, money: (cents: number) => string): string {
  return `${cents < 0 ? "−" : "+"}${money(Math.abs(cents))}`
}

/** An order's affiliate in words (IMPULSEIA-107), for its card on the order's page. */
export function orderAffiliateViewOf(read: OrderAffiliate, input: MoneyWords & { text: Text; hrefOf: (affiliateId: string) => string }): OrderAffiliateView {
  const { text, money, day, date } = input
  const order = text.order
  const commission = read.commission
  const state = !commission
    ? ""
    : commission.status === "REVERSED"
      ? order.reversed
      : commission.status === "AVAILABLE"
        ? format(order.available, { date: commission.availableAt ? date(commission.availableAt) : "" })
        : commission.dueOn
          ? format(order.dueOn, { date: day(commission.dueOn) })
          : order.awaiting
  const nameOf = (party: { name: string } | null) => party?.name ?? ""

  return {
    affiliate: read.affiliate
      ? { name: read.affiliate.name, href: input.hrefOf(read.affiliate.id), standing: read.affiliate.status === "ACTIVE" ? null : text.list.status[read.affiliate.status] }
      : null,
    commission: commission
      ? {
          amount: money(commission.commissionCents),
          detail: format(order.detail, { table: commission.tableName, base: money(commission.baseCents) }),
          state,
          reversed: commission.status === "REVERSED",
          ownPurchase: commission.zeroReason === "OWN_PURCHASE" ? order.ownPurchase : null,
        }
      : null,
    changes: read.changes.map((change, index) => ({
      key: `${change.at}-${index}`,
      at: date(change.at),
      text: change.from && change.to ? format(order.moved, { from: nameOf(change.from), to: nameOf(change.to) }) : change.from ? format(order.removed, { from: nameOf(change.from) }) : format(order.added, { to: nameOf(change.to) }),
      reason: change.reason,
    })),
    refundNotice: read.refundedCents > 0 && commission && commission.status !== "REVERSED" ? format(order.refunded, { amount: money(read.refundedCents) }) : null,
    lockedHint: !read.changeable && commission?.status === "AVAILABLE" ? order.settledHint : null,
    action: read.changeable ? (read.affiliate ? order.change : order.assign) : null,
  }
}

export function affiliateBalanceViewOf(statement: Pick<AffiliateStatement, "availableCents" | "pendingCents">, money: (cents: number) => string, text: Text["money"]): AffiliateBalanceView {
  const short = statement.availableCents < 0
  return {
    available: short ? signedMoneyOf(statement.availableCents, money) : money(statement.availableCents),
    pending: money(statement.pendingCents),
    negativeNotice: short ? format(text.negative, { amount: money(-statement.availableCents) }) : null,
    canPay: statement.availableCents > 0,
  }
}

export function statementRowOf(entry: AffiliateStatementEntry, input: MoneyWords & { text: Text["money"] }): AffiliateStatementRowView {
  const { text } = input
  const detail = entry.payout
    ? [format(text.paidOn, { date: input.day(entry.payout.paidOn), method: text.methods[entry.payout.method] }), entry.payout.note].filter(Boolean).join(" · ")
    : (entry.reason ?? (entry.orderNumber !== null ? format(text.order, { number: String(entry.orderNumber) }) : null))
  return {
    id: entry.id,
    date: input.date(entry.createdAt),
    kind: text.kinds[entry.kind],
    amount: signedMoneyOf(entry.amountCents, input.money),
    negative: entry.amountCents < 0,
    detail,
  }
}

function owedDayOf(row: AffiliateOwedDay, input: MoneyWords & { text: Text["owed"] }): AffiliateOwedDayView {
  const { text } = input
  return {
    key: row.dueOn,
    label: format(text.day, { date: input.day(row.dueOn) }),
    amount: input.money(row.amountCents),
    people: row.affiliateCount === 1 ? text.affiliatesOne : format(text.affiliates, { count: String(row.affiliateCount) }),
    state: row.state,
    stateLabel: text.states[row.state],
  }
}

/** What the shop owes, in words (IMPULSEIA-107), for the "A pagar" screen. */
export function owedViewOf(owed: AffiliateOwed, input: MoneyWords & { text: Text["owed"]; hrefOf: (affiliateId: string) => string }): AffiliateOwedView {
  const { money } = input
  return {
    owed: money(owed.owedCents),
    upcoming: money(owed.upcoming.reduce((sum, day) => sum + day.amountCents, 0)),
    awaiting: money(owed.awaitingDeliveryCents),
    due: owed.due.map((day) => owedDayOf(day, input)),
    upcomingDays: owed.upcoming.map((day) => owedDayOf(day, input)),
    undated: owed.undatedCents > 0 ? money(owed.undatedCents) : null,
    affiliates: owed.affiliates.map((row) => ({
      id: row.affiliate.id,
      name: row.affiliate.name,
      href: input.hrefOf(row.affiliate.id),
      pixKey: row.affiliate.pixKey,
      available: row.availableCents < 0 ? signedMoneyOf(row.availableCents, money) : money(row.availableCents),
      pending: money(row.pendingCents),
      overdue: row.overdue,
      short: row.availableCents < 0,
    })),
  }
}
