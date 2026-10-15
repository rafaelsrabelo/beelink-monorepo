/** What Asaas is told of a shopkeeper: all it asks of a customer whose subscription is paid at Asaas's own invoice. */
export interface PlatformCustomerData {
  /** A person's name or a company's. */
  name: string;
  /** A CPF or a CNPJ with no punctuation. */
  document: string;
  /** The bee-link account's own e-mail. */
  email: string;
}

/** A customer to be registered at bee-link's own account. */
export interface PlatformCustomerRequest extends PlatformCustomerData {
  /** bee-link's name for the account: how the customer is found again. */
  externalReference: string;
}

/** A customer as bee-link's own Asaas account holds it — one not removed. */
export interface PlatformCustomer extends PlatformCustomerData {
  /** `cus_…`. */
  id: string;
}

/** All that is read of a card: Asaas sends its token beside these, and no shape here has a place for it. */
export interface PlatformCard {
  /** In Asaas's word: `VISA`, `MASTERCARD`… */
  brand: string;
  last4: string;
}

/** A subscription as Asaas tells it. */
export interface PlatformSubscription {
  /** `sub_…`. */
  id: string;
  /** Asaas's own word — `ACTIVE`, `INACTIVE`, `EXPIRED` — and one it adds later is not a failure. */
  status: string;
  /** Asaas removes a subscription by marking it: a cancelled one still answers, with this set. */
  deleted: boolean;
  /** `cus_…`. */
  customerId: string | null;
  /** What each cycle is charged. */
  valueCents: number;
  /** Asaas's own word: `MONTHLY`, `SEMIANNUALLY`, `YEARLY`. */
  cycle: string;
  /** `UNDEFINED` until a charge is paid; then what it was paid with. */
  billingType: string;
  /** `YYYY-MM-DD`: the due day of the next charge Asaas will make. Empty when it named none. */
  nextDueDate: string;
  externalReference: string | null;
  card: PlatformCard | null;
}

/**
 * A subscription to be made at bee-link's own account (BEELINK-292). No way of paying is in it: the
 * shopkeeper chooses one at Asaas's invoice, and no card ever comes through bee-link.
 */
export interface PlatformSubscriptionRequest {
  /** `cus_…`. */
  customerId: string;
  /** What each cycle is charged. */
  valueCents: number;
  /** In Asaas's own word: `MONTHLY`, `SEMIANNUALLY`, `YEARLY`. */
  cycle: string;
  /** `YYYY-MM-DD`: the due day of the first charge, which Asaas makes at once. */
  firstDueDay: string;
  /** What the shopkeeper reads on the invoice. */
  description: string;
  /** bee-link's name for the page's subscription: how it is found again. */
  externalReference: string;
}

/** One charge of a subscription, as Asaas tells it. */
export interface PlatformCharge {
  /** `pay_…`. */
  id: string;
  /** Asaas's own word: `PENDING`, `CONFIRMED`, `RECEIVED`, `OVERDUE`, `REFUNDED`… */
  status: string;
  billingType: string;
  valueCents: number;
  /** `YYYY-MM-DD`. */
  dueDate: string;
  /** `YYYY-MM-DD`: the day Asaas has the money as paid; null while it has not. */
  paymentDate: string | null;
  /** `YYYY-MM-DD`: the day a card's charge was confirmed; null otherwise. */
  confirmedDate: string | null;
  /** Asaas's hosted invoice, only when it is `https`: it opens in the shopkeeper's browser. */
  invoiceUrl: string | null;
  /** `sub_…`. */
  subscriptionId: string | null;
  /** The subscription's own reference, which Asaas copies to each charge. */
  externalReference: string | null;
  card: PlatformCard | null;
}

/** A webhook of bee-link's own account, as Asaas tells it (BEELINK-221). The token it was registered with never comes back in a read. */
export interface PlatformWebhook {
  id: string;
  url: string;
  /** Off: Asaas sends it nothing. */
  enabled: boolean;
  /** Asaas stopped sending after fifteen failures in a row, and holds the events meanwhile. */
  interrupted: boolean;
}

/** bee-link's own webhook to be registered at its account (BEELINK-221). */
export interface PlatformWebhookRequest {
  /** How it is told apart in Asaas's panel. */
  name: string;
  url: string;
  /** Who Asaas warns when the queue pauses. */
  email: string;
  /** Sent back in `asaas-access-token` with every event: 32 to 255 characters, no spaces. */
  authToken: string;
}

/** This deployment was given no key of bee-link's own Asaas account: nothing can be asked of it. */
export class PlatformAsaasUnconfigured extends Error {
  constructor() {
    super("This deployment has no key of bee-link's own Asaas account");
  }
}

/**
 * What bee-link asks of its own Asaas account (BEELINK-291, BEELINK-292, BEELINK-221) — the one a page's plan is charged at,
 * never a shop's. A port: the module binds it to `PlatformAsaasHttpClient`, and a test stands a fake
 * Asaas in its place. No call takes a key: the implementation holds the one this deployment was
 * given, and neither answers it nor lets an error carry it. What goes wrong is told with the errors
 * of `shared/asaas/asaas-errors.ts`, the same a shop's account answers with.
 */
export abstract class PlatformAsaas {
  /** Whether this deployment has the key. Without it every call below throws `PlatformAsaasUnconfigured`. */
  abstract readonly configured: boolean;

  /**
   * Every customer of the account, not removed, registered under exactly this reference. A list, since
   * Asaas takes duplicates: looked at before any is created. No answer is thrown, never read as none.
   */
  abstract customers(externalReference: string): Promise<PlatformCustomer[]>;

  /**
   * A customer registered at the account, with Asaas's own notifications off: bee-link is who tells
   * the shopkeeper. Answers its id. No answer is `AsaasOutcomeUnknown`: it may exist.
   */
  abstract createCustomer(customer: PlatformCustomerRequest): Promise<string>;

  /** A customer's name, document and e-mail made what these are; safe to repeat. Refused for one removed from the account. */
  abstract updateCustomer(id: string, customer: PlatformCustomerData): Promise<void>;

  /**
   * Every subscription of the account, not removed, made under exactly this reference. A list, since
   * Asaas takes duplicates: looked at before any is created. No answer is thrown, never read as none.
   */
  abstract subscriptions(externalReference: string): Promise<PlatformSubscription[]>;

  /**
   * A subscription made at the account with no way of paying chosen; Asaas makes its first charge at
   * once. No answer is `AsaasOutcomeUnknown`: it may exist.
   */
  abstract createSubscription(subscription: PlatformSubscriptionRequest): Promise<PlatformSubscription>;

  /**
   * A subscription removed: Asaas removes with it every charge still waiting, and keeps the paid ones.
   * Safe to repeat, and one the account never held is removed already.
   */
  abstract removeSubscription(id: string): Promise<void>;

  /** One subscription by its id, cancelled or not; null when the account has none such. */
  abstract subscription(id: string): Promise<PlatformSubscription | null>;

  /**
   * Every charge of a subscription that was not removed, as Asaas lists them. Asaas answers an empty
   * list for a subscription that does not exist: `subscription` is what says whether one does. A
   * removed subscription's paid charges are still listed (seen on 14/10/2026).
   */
  abstract subscriptionCharges(id: string): Promise<PlatformCharge[]>;

  /** Every webhook of the account (BEELINK-221) — bee-link's and any other product's — looked at before one is registered. */
  abstract webhooks(): Promise<PlatformWebhook[]>;

  /**
   * bee-link's own webhook registered at the account, on and sending in order the events the billing
   * reads (`PLATFORM_WEBHOOK_EVENTS`). Answers its id. Asaas repeats the token in its answer: nothing
   * else of it is read.
   */
  abstract createWebhook(webhook: PlatformWebhookRequest): Promise<string>;

  /**
   * A webhook set to send again — on, its queue no longer interrupted, so what Asaas held meanwhile is
   * sent — with the token handed anew: one changed in this deployment's environment reaches Asaas this way.
   */
  abstract resumeWebhook(id: string, authToken: string): Promise<void>;
}
