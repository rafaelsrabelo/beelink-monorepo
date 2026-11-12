/** One kind of rate on the invite's table — by category, or by product — as a titled list of names and percentages. */
export interface AffiliateRateLinesProps {
  title: string
  lines: readonly { name: string; rate: string }[]
}

export function AffiliateRateLines({ title, lines }: AffiliateRateLinesProps) {
  if (lines.length === 0) return null

  return (
    <div className="flex flex-col gap-1 pt-1">
      <h3 className="text-sm font-medium">{title}</h3>
      <ul className="flex flex-col gap-0.5 text-sm">
        {lines.map((line) => (
          <li key={line.name} className="flex justify-between gap-3">
            <span className="truncate">{line.name}</span>
            <span className="tabular-nums">{line.rate}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
