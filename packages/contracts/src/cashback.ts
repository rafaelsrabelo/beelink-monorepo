/**
 * A shop's cashback (BEELINK-238): the rules its owner sets, and each customer's credit. Credit is the
 * shop's, owed to that customer: it is spent on the shop's own orders, and is not money — it is not
 * withdrawn, transferred, or seen by any other shop.
 *
 * Amounts are whole cents; rates are basis points (500 = 5.00%), as everywhere a discount is stated.
 */

/** The rules, as the panel's form edits them. A shop that never saved any reads the defaults, switched off. */
export interface CashbackSettings {
  enabled: boolean;
  /** What comes back, 1 to 10000, over what the customer paid for the products. */
  rateBps: number;
  /** Days a credit stays usable once its order is delivered, 1 to 3650; null never expires. */
  expiresAfterDays: number | null;
  /** The products' total, after discounts, an order must reach to earn; 0 is any order. */
  minSubtotalCents: number;
  /** How much of an order's products credit may pay for, 1 to 10000. Never the delivery. */
  maxRedeemBps: number;
  /** ISO-8601; null until the owner first saves them. */
  updatedAt: string | null;
}

/** What `PUT /stores/:slug/cashback` takes: the whole of the rules. */
export type CashbackSettingsPayload = Omit<CashbackSettings, "updatedAt">;

/** The window `CashbackOwed.expiringSoonCents` looks ahead, in days. */
export type CashbackExpiringSoonDays = 30;

/** What the shop owes its customers in credit, now. */
export interface CashbackOwed {
  /** Usable now, across every customer. */
  availableCents: number;
  /** Waiting on orders still to be delivered. */
  pendingCents: number;
  /** Of what is usable, what expires within the next `expiringSoonDays`. */
  expiringSoonCents: number;
  expiringSoonDays: CashbackExpiringSoonDays;
}

/** `GET /stores/:slug/cashback`: the rules, and what they have run up. */
export interface CashbackOverview {
  settings: CashbackSettings;
  owed: CashbackOwed;
}

/** Where a lot of credit stands: waiting on its order's delivery, usable, taken back, or expired. */
export type CashbackCreditStatus = "PENDING" | "AVAILABLE" | "VOIDED" | "EXPIRED";

/** A lot still worth something to its customer: pending, or available with something left. */
export interface CashbackCredit {
  id: string;
  status: Extract<CashbackCreditStatus, "PENDING" | "AVAILABLE">;
  amountCents: number;
  remainingCents: number;
  /** The order that earns it; null for a credit the shopkeeper gave. */
  orderNumber: number | null;
  /** ISO-8601; null while pending. */
  availableAt: string | null;
  /** ISO-8601; null never expires. */
  expiresAt: string | null;
}

/**
 * What a line of the statement records. `EARN` is a credit becoming usable (its order delivered);
 * `REDEEM`, credit spent on an order; `REVERSAL`, an undone order taking back what it earned
 * (negative) or giving back what was spent on it (positive); `EXPIRE`, what was left of a lot when it
 * ran out; `ADJUST`, the shopkeeper's correction, either way; `FORFEIT`, what was left when the
 * customer deleted their account.
 */
export type CashbackEntryKind = "EARN" | "REDEEM" | "REVERSAL" | "EXPIRE" | "ADJUST" | "FORFEIT";

/**
 * What an order earns in cashback (BEELINK-239) and where that credit stands: pending until the order
 * is delivered, then usable until spent or expired; void once the order was cancelled. Null on an
 * order that earns nothing.
 */
export interface OrderCashback {
  /** Worked out when the order was placed, at `rateBps`, and never changed after. */
  earnedCents: number;
  rateBps: number;
  status: CashbackCreditStatus;
  /** While pending, what the delivery will make usable; once usable, what is left to spend. */
  remainingCents: number;
  /** ISO-8601; null until delivered. */
  availableAt: string | null;
  /** ISO-8601; null until delivered, and on a credit that never expires. */
  expiresAt: string | null;
}

/** As the shop reads it: also what the customer had spent of it when the order was undone, which the balance did not take back. */
export interface ShopOrderCashback extends OrderCashback {
  unrecoveredCents: number;
}

/** The customer's credit at the shop in their data's copy: every line of the statement, never a page of it. */
export interface CustomerDataCashback {
  balanceCents: number;
  pendingCents: number;
  /** The lots still worth something, as the statement's reader sees them. */
  credits: CashbackCredit[];
  /** The newest first. */
  entries: CashbackEntry[];
}

export interface CashbackEntry {
  id: string;
  kind: CashbackEntryKind;
  /** Signed, never 0: what it added to the balance, or took from it. */
  amountCents: number;
  /** The order it came from, by the number the shop gave it. */
  orderNumber: number | null;
  /** The shopkeeper's reason, on an `ADJUST`. */
  reason: string | null;
  /** ISO-8601. */
  createdAt: string;
}

/** `GET /stores/:slug/customers/:id/cashback`: a customer's credit at the shop, and one page of its history. */
export interface CustomerCashback {
  /** What they can spend now: the statement's sum. */
  balanceCents: number;
  /** What their undelivered orders will earn. Not on the statement until delivered. */
  pendingCents: number;
  /** The soonest a part of the balance expires, and how much; null when none of it does. */
  nextExpiry: { amountCents: number; expiresAt: string } | null;
  /** Every lot still worth something, the soonest to expire first and the pending ones last. */
  credits: CashbackCredit[];
  /** One page of the statement, the newest first. */
  entries: CashbackEntry[];
  total: number;
  page: number;
  pageSize: number;
}

/** What `POST /stores/:slug/customers/:id/cashback/adjustments` takes. */
export interface CashbackAdjustmentPayload {
  /** Signed, never 0, up to R$ 1.000.000,00 either way: positive gives credit, negative takes it. */
  amountCents: number;
  /** 3 to 200 characters, trimmed: why, in the shopkeeper's words. */
  reason: string;
}

/** What the cashback routes answer besides the shop's and the customer's own codes. */
export type CashbackErrorCode =
  /** A rule out of its range, or one missing. */
  | "CASHBACK_SETTINGS_INVALID"
  /** An adjustment of 0, out of range, or with no reason. */
  | "CASHBACK_ADJUSTMENT_INVALID"
  /** An adjustment that takes more than the customer has: the balance never goes below zero. */
  | "CASHBACK_BALANCE_INSUFFICIENT"
  /** An adjustment that would take the balance past R$ 1.000.000,00. */
  | "CASHBACK_BALANCE_TOO_LARGE";
