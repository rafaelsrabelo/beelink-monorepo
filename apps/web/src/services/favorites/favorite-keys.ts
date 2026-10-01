/** The favourites' query keys: one shop's liked ids, which every heart on its pages reads. */
export const favoriteKeys = {
  all: ["favorites"] as const,
  ids: (slug: string) => [...favoriteKeys.all, slug, "ids"] as const,
}
