// UI
import { Button } from "@harness-monorepo/ui/components/button"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { AffiliateShowcaseView } from "@harness-monorepo/ui/lib/affiliate-money"

export interface AffiliateShowcaseCardProps {
  showcase: AffiliateShowcaseView
  onRemovePhoto: () => void
  onRemoveTagline: () => void
  /** Which removal is under way. */
  busy?: "photo" | "tagline" | null
  /** The API's refusal, in words. */
  error?: string
  messages?: UiMessages
}

/**
 * What the shop window shows of an affiliate (IMPULSEIA-107, addendum D of the epic): their photo and
 * phrase, which they edit in their own area and the shop — whose window it is — may take off.
 */
export function AffiliateShowcaseCard({ showcase, onRemovePhoto, onRemoveTagline, busy = null, error, messages = defaultMessages }: AffiliateShowcaseCardProps) {
  const text = messages.affiliates.showcase

  return (
    <section aria-labelledby="affiliate-showcase-title" className="bg-shell-surface border-shell-border flex flex-col gap-4 rounded-xl border p-4 shadow-xs sm:p-6">
      <header className="flex flex-col gap-1">
        <h2 id="affiliate-showcase-title" className="text-lg font-semibold">
          {text.title}
        </h2>
        <p className="text-muted-foreground text-sm">{text.help}</p>
      </header>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex flex-col items-start gap-2">
          {showcase.photoUrl ? (
            <img src={showcase.photoUrl} alt={format(text.photoAlt, { name: showcase.name })} className="size-16 rounded-full object-cover" />
          ) : (
            <p className="text-muted-foreground text-sm">{text.noPhoto}</p>
          )}
          {showcase.photoUrl ? (
            <Button type="button" variant="outline" size="sm" disabled={busy !== null} onClick={onRemovePhoto}>
              {text.removePhoto}
            </Button>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
          <span className="text-muted-foreground text-sm">{text.tagline}</span>
          <p className="text-sm break-words">{showcase.tagline ?? <span className="text-muted-foreground">{text.noTagline}</span>}</p>
          {showcase.tagline ? (
            <Button type="button" variant="outline" size="sm" disabled={busy !== null} onClick={onRemoveTagline}>
              {text.removeTagline}
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </section>
  )
}
