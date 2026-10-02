import type { CustomerDataCashback } from "./cashback.js";
import type { CustomerProfile } from "./customer.js";
import type { CustomerFavorite } from "./favorite.js";
import type { CustomerConversation } from "./conversation.js";
import type { LegalAcceptanceChannel } from "./legal.js";
import type { CustomerOrder } from "./order.js";
import type { CustomerReview } from "./review.js";

/* ── a shopper's data at a shop, theirs to take or to end (BEELINK-152) ── */

/** How an account signs in: its password, Google, or both. */
export type CustomerSignInMethod = "PASSWORD" | "GOOGLE";

/** One version of bee-link's terms the account accepted, where and when. */
export interface CustomerTermsAcceptance {
  version: string;
  via: LegalAcceptanceChannel;
  /** ISO-8601. */
  acceptedAt: string;
}

/** The account itself, as only its owner reads it: never a password, a session or a token. */
export interface CustomerDataAccount {
  name: string;
  email: string;
  /** ISO-8601; null on an account never confirmed. */
  emailVerifiedAt: string | null;
  /** ISO-8601. */
  createdAt: string;
  signInWith: CustomerSignInMethod[];
  /** Oldest first. */
  termsAccepted: CustomerTermsAcceptance[];
}

/** What the profile does not show of the shop's record of them. */
export interface CustomerDataRecord {
  /** ISO-8601: when the shop first recorded them. */
  createdAt: string;
  /** A phone the shopper tried to save that another record of the shop had; null when none. */
  claimedPhone: string | null;
}

/**
 * Everything a shop keeps about the signed-in shopper, in the shapes their account already reads it
 * in — "Baixar meus dados". Every order and conversation, never a page of them.
 */
export interface CustomerDataExport {
  /** ISO-8601: when the file was made. */
  exportedAt: string;
  shop: { name: string; slug: string };
  account: CustomerDataAccount;
  /** The shop's record of them: name, phone, CPF, birth date, saved addresses, notices by e-mail. */
  profile: CustomerProfile;
  record: CustomerDataRecord;
  /** Most recent first. */
  orders: CustomerOrder[];
  /** Most recently liked first. */
  favorites: CustomerFavorite[];
  /** Most recent first, hidden ones too. */
  reviews: CustomerReview[];
  /** One per order that has one, by its order's number, most recent first. */
  conversations: CustomerConversation[];
  /** Their cashback at the shop (BEELINK-239): the balance, what is pending, and the whole statement. */
  cashback: CustomerDataCashback;
}

/**
 * Confirming that a shopper's account ends: its password — or, for an account opened through Google,
 * which has none, its e-mail typed again. A wrong password is `AUTH_PASSWORD_WRONG`, an e-mail that
 * is not the account's `CUSTOMER_DELETE_EMAIL_MISMATCH`.
 */
export interface DeleteCustomerAccountPayload {
  password?: string;
  email?: string;
}
