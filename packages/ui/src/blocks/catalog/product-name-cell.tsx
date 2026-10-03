// Libs
import { TruckIcon } from "lucide-react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface ProductNameCellProps {
  name: string
  imageUrl: string | null
  /** What a carrier lacks to quote it (BEELINK-184); null when nothing does, or the shop ships by no carrier. */
  carrierGap?: "NO_WEIGHT" | "NO_SIZE" | null
  messages?: UiMessages
}

/**
 * A product's name in the panel's list, with its first picture — and, for a shop that ships by
 * carrier, what keeps a carrier from quoting it, under the name. Said in words beside an icon, not a
 * colour alone: it is the row a shopkeeper fixing their weights is scanning for.
 */
export function ProductNameCell({ name, imageUrl, carrierGap = null, messages = defaultMessages }: ProductNameCellProps) {
  const text = messages.catalog.products

  return (
    <div className="flex items-center gap-3">
      <span className="bg-muted flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md">
        {imageUrl ? <img src={imageUrl} alt="" aria-hidden="true" className="size-full object-cover" /> : null}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium">{name}</span>
        {carrierGap ? (
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <TruckIcon aria-hidden="true" className="size-3.5 shrink-0" />
            {carrierGap === "NO_WEIGHT" ? text.carrierNoWeight : text.carrierNoSize}
          </span>
        ) : null}
      </span>
    </div>
  )
}
