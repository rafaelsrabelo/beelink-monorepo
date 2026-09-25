/**
 * A shopper's own door into a shop (docs/product/README.md, "Accounts" and "Customers").
 *
 * The account is bee-link's — the same kind a shopkeeper has — reached through the shop window, and
 * its session is never a shopkeeper's session. What the shop gets is a customer record: a name, a
 * phone and an address, its own, one per shop the person buys from. No shop reads the account.
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

/** What a signed-in shopper sees of themselves at one shop: that shop's record, and the account's e-mail. */
export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  /** Digits only, with the country code. */
  phone: string | null;
  address: CustomerAddress;
}

/** What a shopper may change of their record at a shop. An absent field is left as it is. */
export interface UpdateCustomerProfilePayload {
  name?: string;
  /** Null clears it. */
  phone?: string | null;
  address?: Partial<CustomerAddress>;
}

/**
 * Where a customer stands with the shop. An account that never bought is a lead; one that bought is
 * a customer. Orders leave on WhatsApp and are not recorded yet, so today every one is a lead — the
 * stage is on the wire now so the panel and the CRM to come read it the day orders are kept.
 */
export type CustomerStage = "LEAD" | "CUSTOMER";

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
  /** When the account was opened at this shop. */
  createdAt: string;
}

export interface StoreCustomerPage {
  customers: StoreCustomer[];
  total: number;
  page: number;
  pageSize: number;
}

/** How the panel asks for a page of customers. `q` matches the name, the e-mail or the phone. */
export interface StoreCustomerListQuery {
  q?: string;
  page?: number;
  pageSize?: number;
}

/** What a shopper's door answers besides the account's own codes (`AuthErrorCode`). */
export type CustomerErrorCode = "CUSTOMER_PHONE_TAKEN";
