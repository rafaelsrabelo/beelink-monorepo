// Libs
import { ArrowRightIcon, CheckIcon } from "lucide-react"

// UI
import { Badge } from "@harness-monorepo/ui/components/badge"
import { Button } from "@harness-monorepo/ui/components/button"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface SetupCardProps {
  title: string
  description: string
  actionLabel: string
  href: string
  /** True once the thing is set up. The card stays, so the way back in stays too. */
  done?: boolean
  /** Opens outside the panel — the shop's own window, say. */
  external?: boolean
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * One thing to set up, on the panel's home.
 *
 * A finished card is marked rather than removed. A list that empties as it is worked through looks
 * broken on the last step and gives no way back to what was already done — and "the colours" is a
 * thing a shopkeeper changes again in a month, not a box ticked once.
 *
 * The tick carries a word beside it. A green check on its own announces as nothing at all.
 */
export function SetupCard({
  title,
  description,
  actionLabel,
  href,
  done = false,
  external = false,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: SetupCardProps) {
  const action = external ? (
    <Button variant={done ? "outline" : "default"} render={<a href={href} target="_blank" rel="noreferrer" />}>
      {actionLabel}
      <ArrowRightIcon aria-hidden="true" className="size-4" />
    </Button>
  ) : (
    <Button variant={done ? "outline" : "default"} render={<Link href={href} />}>
      {actionLabel}
      <ArrowRightIcon aria-hidden="true" className="size-4" />
    </Button>
  )

  return (
    <li className={cn("flex flex-col gap-3 rounded-xl border p-5", done && "bg-muted/40")}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold">{title}</h3>
        {done ? (
          <Badge variant="secondary" className="shrink-0 gap-1">
            <CheckIcon aria-hidden="true" className="size-3" />
            {messages.setup.done}
          </Badge>
        ) : null}
      </div>
      <p className="text-muted-foreground flex-1 text-sm">{description}</p>
      <div className="flex">{action}</div>
    </li>
  )
}
