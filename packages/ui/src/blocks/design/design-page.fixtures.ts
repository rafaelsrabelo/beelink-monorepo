// Block
import type { DesignPageRowData } from "./design-page-row"
import type { DesignPageLink } from "./design-page-switcher"

/** A shop with its home, a landing that is up, one still a draft and one taken down. */
export const samplePages: DesignPageLink[] = [
  { id: "home", kind: "HOME", title: "Página inicial", href: "/admin/mutante/design", status: "PUBLISHED" },
  { id: "lp-1", kind: "LANDING", title: "Lançamento Whey", href: "/admin/mutante/design?page=lp-1", status: "PUBLISHED" },
  { id: "lp-2", kind: "LANDING", title: "Black Friday", href: "/admin/mutante/design?page=lp-2", status: "DRAFT" },
  { id: "lp-3", kind: "LANDING", title: "Dia das Mães", href: "/admin/mutante/design?page=lp-3", status: "ARCHIVED" },
]

/** The same pages as the Páginas tab lists them: where each lives, and whether the menu links it. */
const ADDRESSES: Record<string, string> = { home: "/", "lp-1": "/lp/lancamento-whey", "lp-2": "/lp/black-friday", "lp-3": "/lp/dia-das-maes" }

export const samplePageRows: DesignPageRowData[] = samplePages.map((page) => {
  const address = ADDRESSES[page.id] ?? "/"
  return {
    ...page,
    address,
    inMenu: page.id === "lp-1",
    shopHref: page.status === "PUBLISHED" ? `/mutante${address === "/" ? "" : address}` : null,
  }
})
