// Libs
import { GlobeIcon, XIcon } from "lucide-react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface StoreFaviconPreviewProps {
  /** The shop's own icon, or `""` with none chosen. */
  faviconUrl: string
  /** The shop's logo, or `""`: what its pages declare while it has no icon. */
  logoUrl: string
  /** The platform's icon, which a shop with neither is left with. Absent draws a neutral glyph. */
  platformIconUrl?: string
  /** The tab's title: the shop's name. */
  title: string
  messages?: UiMessages
}

/**
 * A browser tab, drawn at its real size: a 16-pixel picture beside the shop's name. It shows what a
 * visitor's tab will show, in the order the shop's pages declare it — the icon, then the logo, then
 * the platform's — and says in a line which of the three it is.
 *
 * `object-contain`, never `cover`: a logo standing in for the icon may not be square, and a tab
 * crops nothing.
 */
export function StoreFaviconPreview({ faviconUrl, logoUrl, platformIconUrl, title, messages = defaultMessages }: StoreFaviconPreviewProps) {
  const text = messages.store.favicon
  const shown = faviconUrl || logoUrl || platformIconUrl
  const caption = faviconUrl ? text.previewOwn : logoUrl ? text.previewLogo : text.previewNone

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-sm font-medium">{text.previewTitle}</figcaption>
      {/* A drawing of browser chrome: the caption below says everything it shows. */}
      <div aria-hidden="true" className="flex w-full max-w-xs items-end rounded-lg bg-muted px-2 pt-2">
        <div className="flex max-w-56 min-w-0 items-center gap-2 rounded-t-md bg-background px-3 py-2 text-xs text-foreground">
          {shown ? (
            <img src={shown} alt="" data-testid="favicon-preview-image" className="size-4 shrink-0 object-contain" />
          ) : (
            <GlobeIcon className="size-4 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate">{title.trim() || text.previewTabFallback}</span>
          <XIcon className="size-3 shrink-0 text-muted-foreground" />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{caption}</p>
    </figure>
  )
}
