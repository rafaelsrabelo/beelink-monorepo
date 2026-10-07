// Block
import type { SalesByOriginRowsProps } from "./report-types"
import { SalesByOriginCards } from "./sales-by-origin-cards"
import { SalesByOriginTable } from "./sales-by-origin-table"

/**
 * A period's sales by where their buyers came from (BEELINK-275): a table where there is room for
 * one, cards where there is not — the panel's own switch, on the width of its main column, so the
 * page never scrolls sideways. Both are in the document; CSS shows one.
 */
export function SalesByOriginList(props: SalesByOriginRowsProps) {
  return (
    <>
      <div className="hidden @xl/main:block">
        <SalesByOriginTable {...props} />
      </div>
      <div className="@xl/main:hidden">
        <SalesByOriginCards {...props} />
      </div>
    </>
  )
}
