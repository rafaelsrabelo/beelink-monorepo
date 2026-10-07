"use client"

// React
import { useId, useState, type CSSProperties } from "react"

// UI
import { ToggleGroup, ToggleGroupItem } from "@harness-monorepo/ui/components/toggle-group"
import type { PopupAnnouncing } from "@harness-monorepo/ui/lib/popup-form"
import type { PopupWords } from "@harness-monorepo/ui/lib/shop-popup"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { POPUP_TEXT, POPUP_TITLE, StorefrontPopupCard } from "../storefront/storefront-popup-card"

export interface PopupPreviewProps {
  /** The pop-up's words as a visitor would read them now — `popupWordsOf`, the function the shop window draws from. */
  words: PopupWords
  imageUrl: string | null
  /** What it is announcing, in a sentence — or that it promises no discount. */
  announcing: PopupAnnouncing
  /** The shop's `--shop-*` variables, so the preview wears the shop's colours and not the panel's. */
  style?: CSSProperties
  messages?: UiMessages
}

type Width = "desktop" | "phone"

/** The primitive's pressed grey is lost against the panel's surface; a choice has to read as chosen. */
const PRESSED = "aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
/** The dialog's own widths: 45rem with a picture and 28rem without on a computer; a 390px phone less the dialog's margins. */
const FRAME: Record<Width, { picture: string; plain: string }> = { desktop: { picture: "w-[45rem]", plain: "w-[28rem]" }, phone: { picture: "w-[22.375rem]", plain: "w-[22.375rem]" } }

/**
 * The pop-up as a visitor will see it, in the panel (BEELINK-306): the very card the shop window
 * draws, at a computer's width or a phone's, with what it is announcing said above it in words.
 *
 * The card is drawn with nothing to operate — its button leads nowhere and its close closes
 * nothing — and its words stay readable to anyone. It scrolls sideways on a panel narrower than a
 * computer's pop-up rather than shrink: a preview squeezed to fit would not be the pop-up.
 */
export function PopupPreview({ words, imageUrl, announcing, style, messages = defaultMessages }: PopupPreviewProps) {
  const text = messages.discounts.popup
  const id = useId()
  const [width, setWidth] = useState<Width>("desktop")
  const label = { desktop: text.previewDesktop, phone: text.previewPhone } satisfies Record<Width, string>

  return (
    <section aria-labelledby={`${id}-title`} className="bg-shell-surface border-shell-border flex flex-col gap-4 rounded-xl border p-4 shadow-xs sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id={`${id}-title`} className="font-semibold">
            {text.preview}
          </h2>
          <p className="text-muted-foreground text-sm">{text.previewHelp}</p>
        </div>
        <ToggleGroup
          aria-label={text.previewWidth}
          value={[width]}
          onValueChange={(next: string[]) => {
            if (next[0] === "desktop" || next[0] === "phone") setWidth(next[0])
          }}
        >
          {(["desktop", "phone"] as const).map((option) => (
            <ToggleGroupItem key={option} value={option} variant="outline" className={PRESSED}>
              {label[option]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* In the page before there is anything to say, so a reader hears it change with the form. Dashed when no discount is promised: it has to read as a different state, not as a different sentence. */}
      <div aria-live="polite" className={cn("rounded-lg px-3 py-2 text-sm", announcing.tone === "nothing" ? "border-foreground/40 bg-background border border-dashed" : "bg-muted")}>
        <p className="font-medium">{announcing.sentence}</p>
        {announcing.note ? <p className="mt-1">{announcing.note}</p> : null}
      </div>

      <div className="bg-muted overflow-x-auto rounded-lg p-4" style={style}>
        <div data-preview-width={width} className={cn("mx-auto max-w-none shrink-0", FRAME[width][imageUrl ? "picture" : "plain"])}>
          <StorefrontPopupCard
            preview
            heading={<p className={POPUP_TITLE}>{words.title}</p>}
            body={<p className={POPUP_TEXT}>{words.text}</p>}
            detail={words.detail}
            imageUrl={imageUrl}
            action={{ label: words.buttonLabel, href: "" }}
          />
        </div>
      </div>
    </section>
  )
}
