/**
 * Which accounts an e-mail is looked up among (docs/product/README.md, "Accounts"): bee-link's own —
 * `storeId` null, a shopkeeper's, the panel's — or one shop's, opened by its shoppers there.
 *
 * Every lookup by e-mail takes one, and none defaults it: a shop's door that left it out would fall,
 * silently, through to the panel's accounts.
 */
export interface AccountScope {
  storeId: string | null;
  /** The shop a shopper's account belongs to, for its e-mails; absent for the panel's. */
  shop?: AccountShop;
}

/**
 * What a shop's account e-mails carry (BEELINK-149): the shop's name, where their links open — the
 * shop's own pages, never the panel's — and where they bring the shopper back once done.
 */
export interface AccountShop {
  name: string;
  /** `/<slug>/<verifyEmail>`, in the shop's own route words. */
  verifyPath: string;
  /** `/<slug>/<resetPassword>`. */
  resetPath: string;
  /** A path inside the shop, where the shopper was going. */
  returnTo: string;
}

export const PANEL_ACCOUNTS: AccountScope = { storeId: null };
