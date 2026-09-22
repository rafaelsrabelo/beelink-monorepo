// React
import type { CSSProperties } from "react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { readableOn } from "@harness-monorepo/ui/lib/contrast"
import type { StoreColors } from "./store-types"

export interface StoreColorPreviewProps {
  colors: StoreColors
  messages?: UiMessages
}

/**
 * What the four colours look like together, drawn the way the storefront draws them: the values
 * arrive as custom properties on this element and every class below reads them. Nothing here holds
 * a colour, which is the same reason the storefront can be themed per shop without a rebuild.
 *
 * The sample is `aria-hidden` under a named `img` role: its contrast is the shopkeeper's choice,
 * not this package's, and a screen reader needs to know the block is a preview, not to read a
 * mock shop window.
 */
export function StoreColorPreview({ colors, messages = defaultMessages }: StoreColorPreviewProps) {
  const text = messages.store.appearance

  return (
    <div
      role="img"
      aria-label={text.previewLabel}
      className="overflow-hidden rounded-lg border border-border bg-(--store-background)"
      style={
        {
          "--store-background": colors.background,
          "--store-primary": colors.primary,
          "--store-text": readableOn(colors.background),
          "--store-header": colors.header,
          "--store-footer": colors.footer,
        } as CSSProperties
      }
    >
      <div aria-hidden="true">
        <div className="h-8 bg-(--store-header)" />
        <div className="flex items-center justify-between gap-3 p-3">
          <span className="text-sm text-(--store-text)">{text.previewSample}</span>
          <span className="rounded-md bg-(--store-primary) px-2 py-1 text-xs text-(--store-background)">
            {text.previewAction}
          </span>
        </div>
      </div>
    </div>
  )
}
