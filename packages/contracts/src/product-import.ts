/**
 * A shop's products read from a document — a PDF of the menu, or a photo of it — and then created.
 *
 * Two steps, on purpose. The read (`POST /stores/:slug/products/import/extract`) writes nothing: it
 * answers drafts the shopkeeper reviews. The import (`POST /stores/:slug/products/import`) creates
 * what they confirmed, as drafts of the catalogue (`DRAFT`), in one transaction. A price is the
 * field a reader gets wrong most often, and a person looks at every one before it is a product.
 */

/** One value of an option as the document gives it: "Morango", or "500 ml" with its own price. */
export interface ProductImportDraftValue {
  name: string;
  /** Whole cents, when the document prices this value apart from the product; null otherwise. */
  priceCents: number | null;
}

/** At most one per product: "Sabor" or "Tamanho", never both. */
export interface ProductImportDraftOption {
  name: string;
  values: ProductImportDraftValue[];
}

/** One product as the reader found it. Nothing about it exists in the shop yet. */
export interface ProductImportDraft {
  name: string;
  /** Only what the document says. Null rather than an invented sentence. */
  description: string | null;
  /** Whole cents. Null when the document shows no price the reader could stand behind. */
  priceCents: number | null;
  /**
   * The group the document puts it under, spelled as one of the shop's categories when it is one.
   * Matching it to an id is the review's job, and the import's again before it creates anything.
   */
  categoryName: string | null;
  option: ProductImportDraftOption | null;
}

/** What the read answers. An empty list is never answered: that is `PRODUCT_IMPORT_UNREADABLE`. */
export interface ProductImportExtraction {
  drafts: ProductImportDraft[];
  /**
   * The addresses the shop's products already hold. A name is unique in a shop, and a row whose
   * name would take one of these is refused by the import — the review checks it as the
   * shopkeeper renames, against the segment the name makes.
   */
  takenSlugs: string[];
}

export interface ProductImportValuePayload {
  name: string;
  /** Whole cents. Absent or null sells this value at the product's price. */
  priceCents?: number | null;
}

export interface ProductImportOptionPayload {
  name: string;
  values: ProductImportValuePayload[];
}

/**
 * One product the shopkeeper confirmed. It is created as a draft, with no photo. Its name makes its
 * address, and a name the shop already has — or that another item of the same import has — is
 * refused with `PRODUCT_SLUG_TAKEN`, as the editor refuses it.
 */
export interface ProductImportItemPayload {
  name: string;
  description?: string | null;
  /** Whole cents, required: a row the review could not price is not sent. */
  priceCents: number;
  /** One of the shop's categories. Wins over `newCategoryName` when both are sent. */
  categoryId?: string | null;
  /**
   * A category to create. Several items naming it — in any case, with or without accents — share
   * one; a name the shop already has reuses that category instead of making a second.
   */
  newCategoryName?: string | null;
  option?: ProductImportOptionPayload | null;
}

export interface ProductImportPayload {
  products: ProductImportItemPayload[];
}

export interface ProductImportResult {
  /** The products created, in the order sent. Every one is a draft. */
  productIds: string[];
  categoriesCreated: number;
}

/**
 * The `errorCode` values the read answers, beside the catalogue's own, which the import can answer
 * too (`PRODUCT_OPTION_DUPLICATE`, `CATALOG_PRICE_INVALID`, …).
 */
export type ProductImportErrorCode =
  /** No key for the reader in this deployment. A state worth running in, not a fault. */
  | "PRODUCT_IMPORT_NOT_CONFIGURED"
  /** Read, and nothing in it was a product — or the file could not be read at all. */
  | "PRODUCT_IMPORT_UNREADABLE"
  /** The reader did not answer. The document is fine; trying again later may be. */
  | "PRODUCT_IMPORT_UNAVAILABLE";
