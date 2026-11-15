// Libs
import { CheckIcon, LinkIcon, PercentIcon } from "lucide-react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface StorefrontAffiliateLinkPreviewProps {
  /** Where an affiliate's link starts: `lessari.com.br/`. The name after it is the preview's. */
  base: string
  /** What a sale through the link earns, in a sentence; null says nothing of it. */
  example: string | null
  messages?: UiMessages
}

/**
 * How an affiliate's link looks (plan 2026-11-14), beside the page's title when the shop gave no
 * picture: the address with a name in it and the band the shop window draws under its header.
 */
export function StorefrontAffiliateLinkPreview({ base, example, messages = defaultMessages }: StorefrontAffiliateLinkPreviewProps) {
  const text = messages.affiliateJoin.linkPreview

  return (
    <figure className="bg-shop-background border-shop-line flex flex-col gap-4 rounded-2xl border p-5 shadow-sm">
      <figcaption className="text-shop-muted text-xs font-semibold tracking-wider uppercase">{text.title}</figcaption>
      <div className="border-shop-line overflow-hidden rounded-xl border" aria-hidden="true">
        <div className="bg-shop-fill border-shop-line text-shop-muted flex items-center gap-2 border-b px-3 py-2 text-sm">
          <LinkIcon className="size-4 shrink-0" />
          <span className="truncate">
            {base}
            <strong className="text-shop-text">{text.slug}</strong>
          </span>
        </div>
        <div className="bg-shop-primary text-shop-on-primary flex items-center gap-3 px-4 py-3">
          <span className="border-shop-on-primary flex size-11 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold">{text.initials}</span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-xs opacity-85">{text.lead}</span>
            <span className="flex flex-wrap items-center gap-2">
              <strong className="tracking-wide uppercase">{text.name}</strong>
              <span className="border-shop-on-primary inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">
                <CheckIcon className="size-3" />
                {text.partner}
              </span>
            </span>
          </div>
        </div>
      </div>
      {example ? (
        <p className="bg-shop-primary-tint text-shop-text flex items-center gap-3 rounded-xl p-3 text-sm">
          <span className="bg-shop-primary text-shop-on-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
            <PercentIcon aria-hidden="true" className="size-4" />
          </span>
          {example}
        </p>
      ) : null}
    </figure>
  )
}
