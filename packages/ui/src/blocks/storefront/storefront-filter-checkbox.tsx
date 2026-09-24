// Libs
import { CheckIcon } from "lucide-react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface StorefrontFilterCheckboxProps {
  label: string
  /** The shelf with this value toggled: on if it is off, off if it is on. */
  href: string
  count: number
  selected: boolean
  locale: string
  linkComponent?: LinkComponent
}

/**
 * One value of a filter group, as 5a draws it: an 18px box in the shop's colour, the name, the count.
 *
 * It is a link and not an `<input>`, because the address is the filter: with scripting off the
 * link still narrows the shelf, and a crawler sees each narrowing as the page it is. The checkbox
 * role — which HTML allows on a link — tells a reader what it does and whether it is on.
 */
export function StorefrontFilterCheckbox({ label, href, count, selected, locale, linkComponent: Link = AnchorLink }: StorefrontFilterCheckboxProps) {
  return (
    <Link href={href} role="checkbox" aria-checked={selected} className="group flex items-center gap-2.5 text-sm">
      <span
        aria-hidden="true"
        className={cn(
          "flex size-[18px] shrink-0 items-center justify-center rounded border",
          selected ? "border-shop-primary bg-shop-primary text-shop-on-primary" : "border-shop-line-strong bg-shop-background group-hover:border-shop-primary",
        )}
      >
        {selected ? <CheckIcon className="size-3" strokeWidth={3} /> : null}
      </span>
      <span className="min-w-0">
        {label} <span className="text-shop-muted">({new Intl.NumberFormat(locale).format(count)})</span>
      </span>
    </Link>
  )
}
