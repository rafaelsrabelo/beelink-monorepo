// React
import { useId } from "react"

// Libs
import { ExternalLinkIcon } from "lucide-react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { StorefrontCopyButton } from "./storefront-copy-button"

export interface StorefrontOrderTrackingProps {
  /** Who brings it: "Correios · SEDEX", or "Entrega da própria loja". */
  by: string
  code: string | null
  /** Where to follow it: the carrier's site, or the shop's own link. */
  href: string | null
  /** What the link says: "Ver no site da transportadora", or "Acompanhar a entrega". */
  hrefLabel: string
  messages?: UiMessages
}

/** How the delivery comes (6e, 6f): who brings it, the code to copy, and where to follow it. */
export function StorefrontOrderTracking({ by, code, href, hrefLabel, messages = defaultMessages }: StorefrontOrderTrackingProps) {
  const text = messages.storefront
  const codeId = useId()

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-shop-line bg-shop-background px-4 py-3 text-shop-on-background">
      <p className="text-xs font-bold tracking-[0.04em] text-shop-muted uppercase">{by}</p>
      {code ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="flex flex-col">
            <span className="sr-only">{text.orderTrackingCode}</span>
            <span id={codeId} className="text-[17px] font-extrabold tracking-[0.04em]">
              {code}
            </span>
          </p>
          <StorefrontCopyButton value={code} label={text.orderTrackingCopy} doneLabel={text.orderTrackingCopied} describedBy={codeId} />
        </div>
      ) : null}
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="flex w-fit items-center gap-1 text-[13px] font-semibold text-shop-primary-ink hover:underline">
          {hrefLabel}
          <ExternalLinkIcon aria-hidden="true" className="size-3.5" />
        </a>
      ) : null}
    </div>
  )
}
