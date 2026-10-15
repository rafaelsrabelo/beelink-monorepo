/**
 * The panel's query keys for what a page owes bee-link (BEELINK-293). A page's check is a branch of
 * its own and not under its subscription's: reading the subscription again must not ask Asaas too.
 */
export const billingKeys = {
  all: ["billing"] as const,
  plans: () => [...billingKeys.all, "plans"] as const,
  account: () => [...billingKeys.all, "account"] as const,
  subscription: (slug: string) => [...billingKeys.all, "subscription", slug] as const,
  check: (slug: string) => [...billingKeys.all, "check", slug] as const,
}
