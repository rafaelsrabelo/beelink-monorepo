/** The category select's value for "the one the document named, created on import". */
export const NEW_CATEGORY = "new"

/**
 * One product of the review, as the screen holds it while the shopkeeper corrects it. The price
 * is what is typed, in reais — the crossing into cents happens in `lib/money`, as in the editor.
 */
export interface ProductImportRow {
  /** Stable across edits, so React keeps a row's focus while its name changes. */
  key: string
  include: boolean
  name: string
  price: string
  /** `""` is no category, `NEW_CATEGORY` is `newCategoryName`, anything else one of the shop's ids. */
  categoryId: string
  /** The name the document gave and the shop does not have. Offered for as long as the row exists. */
  newCategoryName: string | null
  description: string | null
  /** Shown, not edited here: the variations editor is where an option is changed afterwards. */
  option: { name: string; values: { name: string; priceCents: number | null }[] } | null
}
