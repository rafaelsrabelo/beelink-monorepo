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

/** What a shopper's door answers besides the account's own codes (`AuthErrorCode`). */
export type CustomerErrorCode = "CUSTOMER_PHONE_TAKEN";
