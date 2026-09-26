// Types
import type { StorePage } from "@harness-monorepo/contracts"
import type { DesignPageRowData } from "@harness-monorepo/ui/blocks/design/design-page-row"

/** Design mode's address for a page: the home is the editor's own, a landing adds itself as `?page=`. */
export function editorHrefOf(slug: string, page: Pick<StorePage, "id" | "kind">): string {
  const home = `/admin/${slug}/design`
  return page.kind === "HOME" ? home : `${home}?page=${encodeURIComponent(page.id)}`
}

/** Where a visitor finds a page, or null while nobody is served it. */
export function shopHrefOf(slug: string, page: Pick<StorePage, "kind" | "slug" | "status">): string | null {
  if (page.kind === "HOME") return `/${slug}`
  return page.status === "PUBLISHED" && page.slug ? `/${slug}/lp/${page.slug}` : null
}

/**
 * The shop's pages as design mode lists them, each with the addresses it needs. The home is
 * titled in the owner's language rather than by its stored title, which nobody chose.
 */
export function pageRowsOf(slug: string, pages: readonly StorePage[], homeTitle: string): DesignPageRowData[] {
  return pages.map((page) => ({
    id: page.id,
    kind: page.kind,
    title: page.kind === "HOME" ? homeTitle : page.title,
    href: editorHrefOf(slug, page),
    status: page.status,
    address: page.kind === "HOME" ? "/" : `/lp/${page.slug ?? ""}`,
    inMenu: page.inMenu,
    shopHref: shopHrefOf(slug, page),
  }))
}
