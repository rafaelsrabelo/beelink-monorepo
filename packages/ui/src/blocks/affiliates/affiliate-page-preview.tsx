// Libs
import { CheckIcon } from "lucide-react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { AffiliatePagePreviewView } from "@harness-monorepo/ui/lib/affiliate-page"

export interface AffiliatePagePreviewProps {
  view: AffiliatePagePreviewView
  messages?: UiMessages
}

/**
 * The top of the page as a visitor will read it (plan 2026-11-14), beside the editor: the marks
 * filled in by the screen, the shop's colour left to the shop window — the panel has none of it.
 */
export function AffiliatePagePreview({ view, messages = defaultMessages }: AffiliatePagePreviewProps) {
  const text = messages.affiliatePage.editor

  return (
    <aside aria-label={text.preview} className="flex flex-col gap-2">
      <p className="text-sm font-medium">{text.preview}</p>
      <div className="bg-muted/60 flex flex-col gap-3 overflow-hidden rounded-xl border p-5">
        {view.imageUrl ? <img src={view.imageUrl} alt="" className="aspect-video w-full rounded-lg object-cover" /> : null}
        <span className="bg-background w-fit rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase">{view.badge}</span>
        <p className="text-xl leading-tight font-bold break-words">{view.title}</p>
        <p className="text-muted-foreground text-sm break-words">{view.subtitle}</p>
        <span className="bg-primary text-primary-foreground w-fit rounded-lg px-4 py-2 text-sm font-semibold">{view.ctaLabel}</span>
        {view.highlights.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {view.highlights.map((highlight, index) => (
              <li key={index} className="flex items-center gap-2 text-sm">
                <CheckIcon aria-hidden="true" className="size-4 shrink-0" />
                <span className="break-words">{highlight}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <p className="text-muted-foreground text-xs">{text.previewNote}</p>
    </aside>
  )
}
