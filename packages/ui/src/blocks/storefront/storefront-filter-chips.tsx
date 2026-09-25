// Libs
import { XIcon } from "lucide-react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface StorefrontFilterChip {
  label: string
  /** The same shelf without this one filter. */
  href: string
}

export interface StorefrontFilterChipsProps {
  chips: readonly StorefrontFilterChip[]
  className?: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * What is in force, as 5a's removable chips: each a link to the same shelf without it, named
 * "Remover filtro 300 g" for a reader. The filter column shows them on a desktop; the phone, above
 * the grid.
 */
export function StorefrontFilterChips({ chips, className, linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontFilterChipsProps) {
  if (!chips.length) return null

  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)}>
      {chips.map((chip) => (
        <li key={chip.href}>
          <Link
            href={chip.href}
            rel="nofollow"
            aria-label={format(messages.storefront.filterRemove, { label: chip.label })}
            className="inline-flex h-[30px] items-center gap-1.5 rounded-full border border-[color-mix(in_oklab,var(--shop-primary)_40%,transparent)] bg-[color-mix(in_oklab,var(--shop-primary)_6%,transparent)] px-2.5 text-xs font-semibold text-shop-primary-ink"
          >
            {chip.label}
            <XIcon aria-hidden="true" className="size-3" />
          </Link>
        </li>
      ))}
    </ul>
  )
}
