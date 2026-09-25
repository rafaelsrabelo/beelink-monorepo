// UI
import type { SpecRow } from "@harness-monorepo/ui/lib/product-specs"

export interface StorefrontSpecTableProps {
  rows: readonly SpecRow[]
}

/** 5b's "Informações técnicas": a framed table, each label on the shop's fill across 40% of it. */
export function StorefrontSpecTable({ rows }: StorefrontSpecTableProps) {
  if (rows.length === 0) return null

  return (
    <table className="w-full border-collapse border border-shop-line text-[14px]">
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className="border-b border-shop-line last:border-b-0">
            <th scope="row" className="w-2/5 bg-shop-fill px-3.5 py-2.5 text-left align-top font-semibold">
              {row.label}
            </th>
            <td className="px-3.5 py-2.5 align-top">{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
