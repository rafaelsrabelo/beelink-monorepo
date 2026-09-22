// Types
import type {
  CreateProductCategoryPayload,
  CreateProductPayload,
  Product,
  ProductCategory,
  ProductListQuery,
  ProductPage,
  UpdateProductCategoryPayload,
  UpdateProductPayload,
} from "@harness-monorepo/contracts"

/**
 * What a failed call carries: the API's stable code, never a sentence. The screen turns the code
 * into copy in the reader's language (apps/web/AGENTS.md).
 */
export class CatalogRequestError extends Error {
  constructor(readonly errorCode: string) {
    super(errorCode)
    this.name = "CatalogRequestError"
  }
}

/**
 * Declared on every call, a bodyless read included: `refuseCrossOrigin` answers 415 to a request
 * that does not say it speaks JSON, which is what makes a form posted from another site unable to
 * reach these handlers at all.
 */
const JSON_HEADERS: Record<string, string> = { "content-type": "application/json" }

function errorCodeOf(payload: unknown): string {
  return typeof payload === "object" && payload !== null && "errorCode" in payload
    ? String((payload as { errorCode: unknown }).errorCode)
    : "UNKNOWN"
}

/**
 * Every path here is this app's own route handler. The API's address is server-only, and the token
 * that reaches it lives in a cookie page JavaScript cannot read.
 */
async function call<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(path, { headers: JSON_HEADERS, ...init })

  if (!response.ok) {
    throw new CatalogRequestError(errorCodeOf(await response.json().catch(() => null)))
  }

  return (await response.json()) as T
}

const categoriesPath = (slug: string) => `/api/stores/${encodeURIComponent(slug)}/product-categories`

/**
 * Every category the shop has — hidden and empty ones included.
 *
 * Deliberately not the storefront's list, which drops a category with nothing available in it:
 * that is right for a shop window and wrong for the screen where a shopkeeper is about to put the
 * first product into a category they made a minute ago.
 */
export function fetchProductCategories(slug: string): Promise<ProductCategory[]> {
  return call<ProductCategory[]>(categoriesPath(slug), { method: "GET" })
}

export function createProductCategory(
  slug: string,
  payload: CreateProductCategoryPayload,
): Promise<ProductCategory> {
  return call<ProductCategory>(categoriesPath(slug), { method: "POST", body: JSON.stringify(payload) })
}

export function updateProductCategory(
  slug: string,
  categoryId: string,
  payload: UpdateProductCategoryPayload,
): Promise<ProductCategory> {
  return call<ProductCategory>(`${categoriesPath(slug)}/${encodeURIComponent(categoryId)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

/**
 * Deleting a category does not delete its products — the relation is `SetNull`, so they land
 * uncategorised and stay reachable at their own addresses. Its subcategories do go, by cascade.
 */
export function deleteProductCategory(slug: string, categoryId: string): Promise<unknown> {
  return call<unknown>(`${categoriesPath(slug)}/${encodeURIComponent(categoryId)}`, { method: "DELETE" })
}

const productsPath = (slug: string) => `/api/stores/${encodeURIComponent(slug)}/products`

/**
 * One page of the shop's products, drafts included.
 *
 * Deliberately not the storefront's catalogue, which hides them: this is the screen where one is
 * published, and a list that left it out would make that impossible.
 *
 * An empty or absent field is left out of the query string entirely rather than sent blank, so
 * `?status=` — which the API would read as a filter on nothing — never leaves this function.
 */
export function fetchProducts(slug: string, query: ProductListQuery = {}): Promise<ProductPage> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value))
  }

  const search = params.toString()

  return call<ProductPage>(`${productsPath(slug)}${search ? `?${search}` : ""}`, { method: "GET" })
}

export function fetchProduct(slug: string, productId: string): Promise<Product> {
  return call<Product>(`${productsPath(slug)}/${encodeURIComponent(productId)}`, { method: "GET" })
}

export function createProduct(slug: string, payload: CreateProductPayload): Promise<Product> {
  return call<Product>(productsPath(slug), { method: "POST", body: JSON.stringify(payload) })
}

export function updateProduct(
  slug: string,
  productId: string,
  payload: UpdateProductPayload,
): Promise<Product> {
  return call<Product>(`${productsPath(slug)}/${encodeURIComponent(productId)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export function deleteProduct(slug: string, productId: string): Promise<unknown> {
  return call<unknown>(`${productsPath(slug)}/${encodeURIComponent(productId)}`, { method: "DELETE" })
}
