// Libs
import { ArrowRightIcon, CheckIcon } from "lucide-react"

// UI
import { Badge } from "@harness-monorepo/ui/components/badge"
import { buttonVariants } from "@harness-monorepo/ui/components/button"

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
  /** How wide the card sits in its grid. The screen owns the layout; the card owns its inside. */
  className?: string
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
  className,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: SetupCardProps) {
  /*
    A link wearing the button's clothes, which is what `buttonVariants` is for and what every other
    block here does — `store-card` and `store-empty-state` both.

    The Button primitive rendered as an anchor was the first attempt, and it is wrong twice. Base
    UI says so out loud: a component that acts as a button expects a real `<button>`, and rendering
    something else strips the native semantics forms and assistive technology rely on. It is also
    wrong before any of that: this navigates, so it is a link — it belongs in the tab order as one,
    opens in a new tab on the middle click, and offers "copy address" on a right click. A button
    does none of that.
  */
  const look = buttonVariants({ variant: done ? "outline" : "default" })

  const action = external ? (
    <a href={href} target="_blank" rel="noreferrer" className={look}>
      {actionLabel}
      <ArrowRightIcon aria-hidden="true" className="size-4" />
    </a>
  ) : (
    <Link href={href} className={look}>
      {actionLabel}
      <ArrowRightIcon aria-hidden="true" className="size-4" />
    </Link>
  )

  return (
    <li
      className={cn(
        "bg-shell-surface border-shell-border flex flex-col gap-3 rounded-xl border p-5 shadow-xs",
        done && "bg-muted/40",
        className,
      )}
    >
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
