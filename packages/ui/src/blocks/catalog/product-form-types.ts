/**
 * What the product form holds while it is being filled in.
 *
 * Numbers are strings here on purpose. A field a person is halfway through typing is not a number
 * — "1," and "" and "0" are three different states of the same keystroke — and turning them into
 * numbers while they type is how a field fights the person using it. `./money` and the screen do
 * the crossing, once, on submit.
 */
export interface ProductFormValues {
  name: string
  slug: string
  /** Markdown, written with formatting. See ./rich-text.ts for why it is not HTML. */
  description: string
  /** Reais as typed. `./money` is the one place that turns this into the cents the wire carries. */
  price: string
  compareAtPrice: string
  cost: string
  /** `""` is "no category": a select cannot hold null, and the screen turns it back. */
  categoryId: string
  /** On sale, or still being written. See the API's ProductStatus for why it is not a boolean. */
  status: "ACTIVE" | "DRAFT"
  /**
   * Made here or bought to resell. `""` is "not said" — the same trick `categoryId` plays, because
   * a select cannot hold null, and the screen turns it back.
   */
  origin: "IN_HOUSE" | "RESALE" | ""
  imageUrls: string[]
  sku: string
  barcode: string
  trackStock: boolean
  stock: string
  /** Grams, as typed. */
  weight: string
  /** Centimetres, as typed — the API stores millimetres, and the screen multiplies. */
  length: string
  width: string
  height: string
}

export interface ProductCategoryOption {
  id: string
  name: string
  /** Shown beside the name, so two subcategories called "Novidades" are told apart. */
  parentName?: string | null
}

/** One field's complaint, already a sentence. This package never sees an `errorCode`. */
export interface FieldIssue {
  message?: string
}

export type ProductFormIssues = Partial<Record<keyof ProductFormValues, FieldIssue | undefined>>

/** The empty product, so the screen and the stories agree on what "new" looks like. */
export const EMPTY_PRODUCT: ProductFormValues = {
  name: "",
  slug: "",
  description: "",
  price: "",
  compareAtPrice: "",
  cost: "",
  categoryId: "",
  status: "ACTIVE",
  origin: "",
  imageUrls: [],
  sku: "",
  barcode: "",
  trackStock: false,
  stock: "",
  weight: "",
  length: "",
  width: "",
  height: "",
}
