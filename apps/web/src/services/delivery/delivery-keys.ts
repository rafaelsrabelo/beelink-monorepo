/** The panel's delivery query keys: one shop's delivery rules. */
export const deliveryKeys = {
  all: ["delivery"] as const,
  settings: (slug: string) => [...deliveryKeys.all, slug, "settings"] as const,
}
