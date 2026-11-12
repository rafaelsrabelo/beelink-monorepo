export interface ProductStockCellProps {
  trackStock: boolean
  stockQuantity: number | null
  /** Said where the shop does not count the product. */
  untrackedLabel: string
}

/**
 * A product's stock in the panel's list. "Not tracked" and "none left" are different facts, and the
 * shop that sells made to order is the first kind. Printing 0 for both is what sends someone looking
 * for a stock screen that has nothing to do with why the product is hidden.
 */
export function ProductStockCell({ trackStock, stockQuantity, untrackedLabel }: ProductStockCellProps) {
  return trackStock ? <>{stockQuantity ?? 0}</> : <span className="text-muted-foreground text-xs">{untrackedLabel}</span>
}
