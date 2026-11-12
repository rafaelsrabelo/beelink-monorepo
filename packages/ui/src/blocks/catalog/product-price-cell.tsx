export interface ProductPriceCellProps {
  priceCents: number
  compareAtPriceCents: number | null
  money: Intl.NumberFormat
}

/** A product's price in the panel's list, and the old one struck through under it when there is one. */
export function ProductPriceCell({ priceCents, compareAtPriceCents, money }: ProductPriceCellProps) {
  return (
    <>
      <span className="font-medium tabular-nums">{money.format(priceCents / 100)}</span>
      {/* The old price is struck through here as it is in the window, so the shopkeeper
          sees the discount the way a customer will rather than two numbers side by side. */}
      {compareAtPriceCents ? <span className="text-muted-foreground block text-xs line-through tabular-nums">{money.format(compareAtPriceCents / 100)}</span> : null}
    </>
  )
}
