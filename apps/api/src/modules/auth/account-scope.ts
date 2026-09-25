/**
 * Which accounts an e-mail is looked up among (docs/product/README.md, "Accounts"): bee-link's own —
 * `storeId` null, a shopkeeper's, the panel's — or one shop's, opened by its shoppers there.
 *
 * Every lookup by e-mail takes one, and none defaults it: a shop's door that left it out would fall,
 * silently, through to the panel's accounts.
 */
export interface AccountScope {
  storeId: string | null;
  /** Where an e-mailed link brings the person back to: the shop, for a shopper. */
  continuePath?: string;
}

export const PANEL_ACCOUNTS: AccountScope = { storeId: null };
