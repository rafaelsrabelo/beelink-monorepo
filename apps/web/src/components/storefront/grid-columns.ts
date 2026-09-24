/** How many across a grid of the shop window may be asked for. The API holds a block to the same. */
export type GridColumns = 2 | 3 | 4 | 5 | 6

/**
 * The shopkeeper's column count when it is one a grid draws, and nothing otherwise — the grid then
 * picks its own, which is what "automático" in the editor means.
 */
export function gridColumnsOf(columns: number | null): GridColumns | undefined {
  return columns !== null && Number.isInteger(columns) && columns >= 2 && columns <= 6 ? (columns as GridColumns) : undefined
}
