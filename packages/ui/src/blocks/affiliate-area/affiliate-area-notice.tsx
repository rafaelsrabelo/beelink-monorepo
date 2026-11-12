// UI
import { Button } from "@harness-monorepo/ui/components/button"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface AffiliateAreaNoticeProps {
  /** `notFound`: no standing with this shop; `failed`: the read did not come. */
  kind: "notFound" | "failed"
  onRetry?: () => void
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** What the area says when a shop's page cannot be drawn (IMPULSEIA-108): never as an empty page. */
export function AffiliateAreaNotice({ kind, onRetry, linkComponent: Link = AnchorLink, messages = defaultMessages }: AffiliateAreaNoticeProps) {
  const text = messages.affiliateArea

  if (kind === "notFound") {
    return (
      <div className="flex flex-col items-center gap-2 px-2 py-12 text-center">
        <h1 className="text-lg font-semibold">{text.notFound.title}</h1>
        <p className="text-muted-foreground max-w-sm text-sm">{text.notFound.body}</p>
        <Link href="/afiliado" className="text-sm font-medium underline-offset-4 hover:underline">
          {text.notFound.action}
        </Link>
      </div>
    )
  }

  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-2 py-12 text-center">
      <p className="text-sm">{text.failed}</p>
      {onRetry ? (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          {text.retry}
        </Button>
      ) : null}
    </div>
  )
}
