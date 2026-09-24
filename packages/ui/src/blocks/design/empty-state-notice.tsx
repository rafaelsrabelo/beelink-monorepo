// Libs
import { ExternalLinkIcon, InfoIcon } from "lucide-react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface EmptyStateNoticeProps {
  /** What is missing, in the owner's terms. */
  title: string
  /** Why the block draws nothing — the cause, in one sentence. */
  body: string
  /** The way out, when it is somewhere else in the panel. Absent when the fix is in this sheet. */
  action?: { label: string; href: string }
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * Why a block draws nothing, said to the one person who can change it, with the way out.
 *
 * Design mode used to show the owner the sentence written for a visitor — "Esta loja ainda não
 * separou o que vende em categorias" — over a shop that had four categories and no product in any
 * of them: the words of an empty shop, and not a word about the cause. The shop window keeps that
 * sentence; this is the sheet's.
 *
 * The way out opens in another tab: design mode's arrangement is a draft until published, and a
 * link that left the page would leave it behind.
 */
export function EmptyStateNotice({
  title,
  body,
  action,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: EmptyStateNoticeProps) {
  const text = messages.design.emptyStates

  return (
    <div className="bg-muted/50 border-shell-border flex gap-3 rounded-lg border p-3">
      <InfoIcon aria-hidden="true" className="text-muted-foreground mt-0.5 size-4 shrink-0" />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-muted-foreground text-sm">{body}</p>
        {action ? (
          <Link
            href={action.href}
            target="_blank"
            className="text-primary inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
          >
            {action.label}{" "}
            <ExternalLinkIcon aria-hidden="true" className="size-3.5" />
            <span className="sr-only">({text.opensInNewTab})</span>
          </Link>
        ) : null}
      </div>
    </div>
  )
}
