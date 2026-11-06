// UI
import { Badge } from "@harness-monorepo/ui/components/badge"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface ProductStatusBadgeProps {
  status: "ACTIVE" | "DRAFT"
  /** The shelf is empty, as the API derived it — never recomputed here. */
  soldOut: boolean
  messages?: UiMessages
}

/**
 * Three states, because two were a lie on screen: a row marked "Ativo" with a stock of zero is not
 * on sale, and reading it was what sent a shopkeeper looking for a bug that was in the words rather
 * than in the shop.
 */
export function ProductStatusBadge({ status, soldOut, messages = defaultMessages }: ProductStatusBadgeProps) {
  const text = messages.catalog.products

  // A draft wins over an empty shelf: the shopkeeper's intention is the headline, and a product that
  // was never published is not "sold out" — nobody could have bought it. `outline` and not
  // `secondary`: secondary is near-white on the table, and a draft is the row being scanned for.
  if (status === "DRAFT") return <Badge variant="outline">{text.statusDraft}</Badge>

  // Outline with a red border and red text, not the tinted `destructive` pill: that pill puts the
  // destructive token on a 10% wash of itself and measures 3.99:1, under the 4.5:1 this package's own
  // axe run enforces — so the one state a shopkeeper is scanning for would have been the only one
  // they could not read. On the table's white surface the same red is 4.77:1.
  // (No literal colour here, even in a comment: `web/no-hex-colors` is a raw grep at zero.)
  if (soldOut) {
    return (
      <Badge variant="outline" className="border-destructive/40 text-destructive">
        {text.statusSoldOut}
      </Badge>
    )
  }

  return <Badge variant="default">{text.statusActive}</Badge>
}
