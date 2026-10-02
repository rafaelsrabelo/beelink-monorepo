import type { AuthSession, EmailPayload, RegisterPayload } from "./auth.js";

/**
 * A shopper's own door into a shop (docs/product/README.md, "Accounts" and "Customers").
 *
 * The account is bee-link's — the same kind a shopkeeper has — reached through the shop window, and
 * its session is never a shopkeeper's session. What the shop gets is a customer record: a name, a
 * phone and their addresses, its own, one per shop the person buys from. No shop reads the account.
 *
 * Signing up, signing in, refreshing and signing out take the same payloads as the panel's door
 * (`RegisterPayload`, `LoginPayload`, `RefreshPayload`, `LogoutPayload`) and answer the same
 * `AuthSession`; only the address differs, `/stores/:slug/customer/...`.
 */

/** Where a shopper receives an order. Every part is optional until the first order asks for it. */
export interface CustomerAddress {
  zipCode: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  /** Two letters, upper case: `SP`. */
  state: string | null;
}

/**
 * One of the places a shopper receives orders (BEELINK-148), as the shop keeps it. The default is
 * where an order goes unless another is chosen, and the address the panel reads and writes.
 */
export interface CustomerSavedAddress extends CustomerAddress {
  id: string;
  /** What the shopper calls it — "Casa", "Trabalho"; null when they gave it no name. */
  label: string | null;
  /** Who receives an order there; null is the shopper, by their name when the order is placed. */
  recipientName: string | null;
  isDefault: boolean;
}

/**
 * A saved address as the shopper writes it, whole: a save replaces every part, and blank is null.
 * The ZIP code, the street, the city and the state are required, since it is where the shop
 * delivers. The number may be missing ("s/n"). `isDefault: true` makes it the default; false or
 * absent leaves the default where it is. The first address is the default whatever it says, and one
 * past the tenth is refused with `CUSTOMER_ADDRESS_LIMIT`.
 */
export interface SaveCustomerAddressPayload {
  label?: string | null;
  recipientName?: string | null;
  zipCode: string;
  street: string;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city: string;
  /** Two letters; upper-cased when kept. */
  state: string;
  isDefault?: boolean;
}

/**
 * Signing up at a shop: the panel's own payload, and where the confirmation link brings the shopper
 * back once they confirm — a path inside the shop, where they were going; anything else is the
 * shop's front.
 */
export interface CustomerRegisterPayload extends RegisterPayload {
  returnTo?: string;
}

/** Asking a shop for a new link, confirmation or password: the e-mail, and where the link brings the shopper back. */
export interface CustomerEmailPayload extends EmailPayload {
  returnTo?: string;
}

/** What a signed-in shopper sees of themselves at one shop: that shop's record, and the account's e-mail. */
export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  /** Digits only, with the country code. */
  phone: string | null;
  /** The eleven digits, for the shop's invoice; null while the shopper has not given it. */
  cpf: string | null;
  /** `YYYY-MM-DD`, a date with no time; null while the shopper has not given it. */
  birthDate: string | null;
  /** The default address's parts; every part null while there is none. */
  address: CustomerAddress;
  /** Every saved address, the default first, then the newest. */
  addresses: CustomerSavedAddress[];
  /**
   * Whether the account has a password — one opened through Google has none until it creates one,
   * by the link `POST /customer/me/password/link` sends (BEELINK-150).
   */
  hasPassword: boolean;
  /** Which notices by e-mail the shopper takes from this shop (BEELINK-151). */
  notifications: CustomerNotifications;
}

/** A shopper's notices by e-mail at one shop (BEELINK-151). */
export interface CustomerNotifications {
  /** Their orders' progress — accepted, on its way or ready, delivered, cancelled. On by default. */
  orders: boolean;
  /** A favourite that got cheaper or came back in stock. On by default: the shopper chose the favourite. */
  favorites: boolean;
  /** Their cashback about to expire (BEELINK-241). On by default: it is their own credit, never an offer. */
  cashback: boolean;
  /** The shop's offers and news. Off until the shopper says yes. */
  offers: boolean;
  /** ISO-8601: when the shopper last chose about offers, either way — the consent's date; null while they never did. */
  offersChosenAt: string | null;
}

/** The shopper's notices, all of them, as the "Avisos" form sends them. */
export interface UpdateCustomerNotificationsPayload {
  orders: boolean;
  favorites: boolean;
  cashback: boolean;
  offers: boolean;
}

/**
 * A signed-in shopper's new password: the current one, and the new one, 8 to 128 characters. The
 * other devices' sessions end; this one stays. A wrong current password is `AUTH_PASSWORD_WRONG`, an
 * account with none `AUTH_PASSWORD_NOT_SET`.
 */
export interface ChangeCustomerPasswordPayload {
  currentPassword: string;
  newPassword: string;
}

/** Asking for the link that creates a password — for an account opened through Google — and where it brings the shopper back. */
export interface CustomerPasswordLinkPayload {
  returnTo?: string;
}

/**
 * What a shopper may change of their record at a shop. An absent field is left as it is. The
 * addresses are saved on their own (`SaveCustomerAddressPayload`).
 */
export interface UpdateCustomerProfilePayload {
  name?: string;
  /** Null clears it. */
  phone?: string | null;
  /** As a person writes it, points and dash or not; its check digits must hold. Null clears it. */
  cpf?: string | null;
  /** `YYYY-MM-DD`: a day that exists, not in the future, not before 1900. Null clears it. */
  birthDate?: string | null;
}

/**
 * Where a customer stands with the shop, from their valid orders — a cancelled one counts for
 * nothing. No order is a lead; the last one within the shop's `inactiveAfterDays` is a customer;
 * longer ago is inactive. Computed when read, so changing the shop's number moves everyone at once.
 */
export type CustomerStage = "LEAD" | "CUSTOMER" | "INACTIVE";

/** How the panel orders the customers: newest registered, latest order, most orders, most spent. */
export type StoreCustomerSort = "RECENT" | "LAST_ORDER" | "MOST_ORDERS" | "TOP_SPENT";

/** One of a shop's customers, as its owner sees them in the panel. Never on the shop window. */
export interface StoreCustomer {
  id: string;
  name: string;
  /** The account's e-mail; null once the account itself was deleted. */
  email: string | null;
  /** Whether the account confirmed its e-mail. */
  emailVerified: boolean;
  /** Digits only, with the country code. */
  phone: string | null;
  city: string | null;
  /** Two letters, upper case. */
  state: string | null;
  stage: CustomerStage;
  /** Valid orders — a cancelled one is not counted. */
  ordersCount: number;
  /** Whole cents, over the valid orders. */
  totalSpentCents: number;
  /** ISO-8601; null with no valid order. */
  lastOrderAt: string | null;
  /** Whole days since the last valid order; null with none. */
  daysSinceLastOrder: number | null;
  /** When the account was opened at this shop. */
  createdAt: string;
  /** Another record of the shop may be the same person (`CustomerDuplicate`); the record lists them. */
  possibleDuplicate: boolean;
}

/**
 * Why two of a shop's records may be one person. `PHONE`: one of them tried to save the other's phone
 * — the phone is unique in a shop, so a refused save is the only trace of it. `NAME`: the names read
 * the same, case and extra spaces aside. Two records with an account are never flagged: they cannot
 * be merged.
 */
export type CustomerDuplicateReason = "PHONE" | "NAME";

/** Another record of the shop that may be the same person, as the record offers to merge it. */
export interface CustomerDuplicate {
  id: string;
  name: string;
  /** Digits only, with the country code. */
  phone: string | null;
  /** The account's e-mail; null for a record the shopkeeper registered. */
  email: string | null;
  /** Whether it has an account: the one that has one is the one kept. */
  hasAccount: boolean;
  /** Valid orders — a cancelled one is not counted. */
  ordersCount: number;
  /** `PHONE` wins when both apply. */
  reason: CustomerDuplicateReason;
}

/**
 * One customer as their record in the panel reads them: the list's row, where they are, and the rest
 * of their numbers — every one over the valid orders, a cancelled one counting for nothing.
 */
export interface StoreCustomerDetail extends StoreCustomer {
  address: CustomerAddress;
  /** What the shopper gave for the invoice, as `CustomerProfile` has them; the shop only reads them. */
  cpf: string | null;
  birthDate: string | null;
  /** ISO-8601; null with no valid order. */
  firstOrderAt: string | null;
  /** `totalSpentCents ÷ ordersCount`, rounded to the nearest whole cent; null with no valid order. */
  averageTicketCents: number | null;
  /** The shop's other records that may be this person, strongest reason first. */
  duplicates: CustomerDuplicate[];
}

/**
 * Two records of one person made one, by the shopkeeper — never on their own: anyone can type
 * someone else's phone. The record with an account is kept; with neither, the one in the address.
 * Every order moves to it, the books are read again from them, a missing phone or a missing address
 * is taken from the other, and the other is deleted. Answers the kept record.
 */
export interface MergeStoreCustomerPayload {
  otherId: string;
}

/**
 * What the shopkeeper may change of a customer: the shop's own record — the same one the shopper
 * sees at the shop. The e-mail is the account's and is not the shop's to change. An absent field is
 * left as it is. The phone, when sent, is a phone: a customer known only by it would otherwise become
 * unreachable, and one another customer of the shop has is refused with `CUSTOMER_PHONE_TAKEN`.
 */
export interface UpdateStoreCustomerPayload {
  name?: string;
  phone?: string;
  /** A part sent as null or blank is cleared; a part left out is kept. */
  address?: Partial<CustomerAddress>;
}

export interface StoreCustomerPage {
  customers: StoreCustomer[];
  total: number;
  page: number;
  pageSize: number;
  /** How many match the search in each stage, whatever `stage` narrowed the page to. */
  stageCounts: Record<CustomerStage, number>;
}

/**
 * A customer the shopkeeper registers — someone who bought by WhatsApp and has no account. The phone
 * is kept as a WhatsApp link wants it and identifies them in the shop: one already there is
 * refused with `CUSTOMER_PHONE_TAKEN`, and the panel offers that customer instead.
 */
export interface CreateStoreCustomerPayload {
  name: string;
  phone: string;
  address?: Partial<CustomerAddress>;
}

/** How the panel asks for a page of customers. `q` matches the name, the e-mail or the phone. */
export interface StoreCustomerListQuery {
  q?: string;
  stage?: CustomerStage;
  /** Absent is `RECENT`. */
  sort?: StoreCustomerSort;
  page?: number;
  pageSize?: number;
}

/** How a shopper may sign in at a shop besides e-mail and password: Google, when it is set up. */
export interface CustomerSignInOptions {
  google: boolean;
}

/** Where a Google sign-in starts: the address to send the browser to, and the state to hold it to. */
export interface GoogleAuthorization {
  url: string;
  state: string;
}

export interface GoogleAuthorizePayload {
  /** Where to return inside the shop once signed in; the web keeps it inside the shop again. */
  returnTo?: string;
}

/** What Google sent back to the fixed callback address. */
export interface GoogleCallbackPayload {
  code: string;
  state: string;
}

/** A finished Google sign-in: the shopper's session at the shop the flow began in, and where to go. */
export interface GoogleSignIn {
  session: AuthSession;
  storeSlug: string;
  returnTo: string | null;
}

/** What a shopper's door answers besides the account's own codes (`AuthErrorCode`). */
export type CustomerErrorCode =
  | "CUSTOMER_PHONE_TAKEN"
  /** Not eleven digits, all one digit, or check digits that do not hold. */
  | "CUSTOMER_CPF_INVALID"
  /** A day that does not exist, one in the future, or one before 1900. */
  | "CUSTOMER_BIRTH_DATE_INVALID"
  /** A saved address that is not this shopper's at this shop. */
  | "CUSTOMER_ADDRESS_NOT_FOUND"
  /** An eleventh address: ten is plenty for one person, and a cap on what a script could pile up. */
  | "CUSTOMER_ADDRESS_LIMIT"
  /** The panel asked for a customer this shop does not have. */
  | "CUSTOMER_NOT_FOUND"
  /** A record merged with itself. */
  | "CUSTOMER_MERGE_SELF"
  /** Both records have an account: two people's sign-ins cannot become one record. */
  | "CUSTOMER_MERGE_TWO_ACCOUNTS"
  /** Deleting an account opened through Google: the e-mail typed is not the account's. */
  | "CUSTOMER_DELETE_EMAIL_MISMATCH"
  /** Google sign-in is not set up on this deployment. */
  | "GOOGLE_SIGN_IN_UNAVAILABLE"
  /** The state is unknown, used or expired: the flow was not started here, or took too long. */
  | "GOOGLE_STATE_INVALID"
  /** Google refused the code — a wrong PKCE verifier among the reasons. */
  | "GOOGLE_EXCHANGE_FAILED"
  /** Google did not vouch for the e-mail, so no account is made or linked from it. */
  | "GOOGLE_EMAIL_UNVERIFIED";
