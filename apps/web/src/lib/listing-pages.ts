// Types
import type { StorefrontCatalog } from "@harness-monorepo/contracts"

// App
import type { CatalogueAsk } from "./storefront-data"
import { listingFiltersOf } from "./storefront-routes"

/**
 * One more page of a shelf, as the infinite listing asks the browser's handler for it. A part of the
 * catalogue the API answers, under its own names: nothing here is a shape of its own.
 */
export type ListingPage = Pick<StorefrontCatalog, "products" | "page" | "pageSize" | "total">

function wholeOf(raw: string | null, least: number, most: number): number | undefined {
  const value = Number(raw)
  return Number.isInteger(value) && value >= least && value <= most ? value : undefined
}

/**
 * The ask `catalogueQueryOf` wrote, read back from a request's query — through the same reading the
 * address gets (`listingFiltersOf`), so a query a visitor edited by hand reaches the API no less
 * clean than the page's own. Null without a page that is a whole number: answering page one instead
 * would hand the listing the products it already shows, twice.
 */
export function listingPageAskOf(query: URLSearchParams, pageSizeMost: number): (CatalogueAsk & { page: number }) | null {
  const page = wholeOf(query.get("pagina"), 1, 10_000)
  if (page === undefined) return null

  const category = query.get("categoria")?.trim()
  const search = query.get("busca")?.trim()

  return {
    ...listingFiltersOf({
      ordenar: query.get("ordenar") ?? undefined,
      precoMin: query.get("precoMin") ?? undefined,
      precoMax: query.get("precoMax") ?? undefined,
      desconto: query.get("desconto") ?? undefined,
      opcao: query.getAll("opcao"),
    }),
    ...(category ? { category } : {}),
    ...(search ? { search } : {}),
    page,
    pageSize: wholeOf(query.get("porPagina"), 1, pageSizeMost) ?? pageSizeMost,
  }
}
