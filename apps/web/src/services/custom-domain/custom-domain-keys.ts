/** The panel's query keys for a shop's own domain: where it stands, and what to point it at. */
export const customDomainKeys = {
  all: ["custom-domain"] as const,
  overview: (slug: string) => [...customDomainKeys.all, slug, "overview"] as const,
}
