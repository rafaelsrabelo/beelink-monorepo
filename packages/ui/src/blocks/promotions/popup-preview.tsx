"use client"

// React
import { useId, useState, type CSSProperties } from "react"

// UI
import { ToggleGroup, ToggleGroupItem } from "@harness-monorepo/ui/components/toggle-group"
import type { PopupAnnouncing } from "@harness-monorepo/ui/lib/popup-form"
import type { CustomerPopupWords, PopupWords } from "@harness-monorepo/ui/lib/shop-popup"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { POPUP_TEXT, POPUP_TITLE, StorefrontPopupCard } from "../storefront/storefront-popup-card"

export interface PopupPreviewProps {
  /** The pop-up's words as a visitor would read them now — `popupWordsOf`, the function the shop window draws from. */
  words: PopupWords
  /**
   * What a signed-in customer who never ordered would read now (BEELINK-310) — `customerPopupWordsOf`,
   * from the offer the API says is theirs; null when the shop has nothing for a first purchase, and
   * such a customer is shown no pop-up.
   */
  customerWords: CustomerPopupWords | null
  imageUrl: string | null
  /** What it is announcing, in a sentence — or that it promises no discount. */
  announcing: PopupAnnouncing
  /** The shop's `--shop-*` variables, so the preview wears the shop's colours and not the panel's. */
  style?: CSSProperties
  messages?: UiMessages
}

type Width = "desktop" | "phone"
type Reader = "visitor" | "customer"

/** The primitive's pressed grey is lost against the panel's surface; a choice has to read as chosen. */
const PRESSED = "aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
/** The dialog's own widths: 45rem with a picture and 28rem without on a computer; a 390px phone less the dialog's margins. */
const FRAME: Record<Width, { picture: string; plain: string }> = { desktop: { picture: "w-[45rem]", plain: "w-[28rem]" }, phone: { picture: "w-[22.375rem]", plain: "w-[22.375rem]" } }
const READERS = ["visitor", "customer"] as const satisfies readonly Reader[]
const WIDTHS = ["desktop", "phone"] as const satisfies readonly Width[]

/**
 * The pop-up as it will be seen, in the panel (BEELINK-306): the very card the shop window draws,
 * at a computer's width or a phone's, with what it is announcing said above it in words.
 *
 * It is drawn for either of the two people it speaks to (BEELINK-310): a visitor, in the
 * shopkeeper's words, or a signed-in customer who never ordered, in the product's — with the code
 * the API says is theirs. With nothing for a first purchase that customer sees no pop-up, and the
 * preview says so instead of drawing one.
 *
 * The card is drawn with nothing to operate — its button leads nowhere and its close closes
 * nothing — and its words stay readable to anyone. It scrolls sideways on a panel narrower than a
 * computer's pop-up rather than shrink: a preview squeezed to fit would not be the pop-up.
 */
export function PopupPreview({ words, customerWords, imageUrl, announcing, style, messages = defaultMessages }: PopupPreviewProps) {
  const text = messages.discounts.popup
  const offers = messages.storefront.offers
  const id = useId()
  const [width, setWidth] = useState<Width>("desktop")
  const [reader, setReader] = useState<Reader>("visitor")
  const widthLabel = { desktop: text.previewDesktop, phone: text.previewPhone } satisfies Record<Width, string>
  const readerLabel = { visitor: text.previewVisitor, customer: text.previewCustomer } satisfies Record<Reader, string>

  const said: PopupAnnouncing = reader === "visitor" ? announcing : customerWords ? { tone: "benefit", sentence: text.previewCustomerNote } : { tone: "nothing", sentence: text.previewCustomerNothing }
  const drawn = reader === "visitor" ? words : customerWords
  const code = reader === "customer" && customerWords?.code ? { value: customerWords.code, copyLabel: offers.copy, copiedLabel: offers.copied, selectedLabel: offers.copySelected } : null

  return (
    <section aria-labelledby={`${id}-title`} className="bg-shell-surface border-shell-border flex flex-col gap-4 rounded-xl border p-4 shadow-xs sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id={`${id}-title`} className="font-semibold">
            {text.preview}
          </h2>
          <p className="text-muted-foreground text-sm">{text.previewHelp}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ToggleGroup
            aria-label={text.previewReader}
            value={[reader]}
            onValueChange={(next: string[]) => {
              const chosen = READERS.find((option) => option === next[0])
              if (chosen) setReader(chosen)
            }}
          >
            {READERS.map((option) => (
              <ToggleGroupItem key={option} value={option} variant="outline" className={PRESSED}>
                {readerLabel[option]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <ToggleGroup
            aria-label={text.previewWidth}
            value={[width]}
            onValueChange={(next: string[]) => {
              const chosen = WIDTHS.find((option) => option === next[0])
              if (chosen) setWidth(chosen)
            }}
          >
            {WIDTHS.map((option) => (
              <ToggleGroupItem key={option} value={option} variant="outline" className={PRESSED}>
                {widthLabel[option]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>

      {/* In the page before there is anything to say, so a reader hears it change with the form. Dashed when no discount is promised: it has to read as a different state, not as a different sentence. */}
      <div aria-live="polite" className={cn("rounded-lg px-3 py-2 text-sm", said.tone === "nothing" ? "border-foreground/40 bg-background border border-dashed" : "bg-muted")}>
        <p className="font-medium">{said.sentence}</p>
        {said.note ? <p className="mt-1">{said.note}</p> : null}
      </div>

      {drawn ? (
        <div className="bg-muted overflow-x-auto rounded-lg p-4" style={style}>
          <div data-preview-width={width} data-preview-reader={reader} className={cn("mx-auto max-w-none shrink-0", FRAME[width][imageUrl ? "picture" : "plain"])}>
            <StorefrontPopupCard
              preview
              heading={<p className={POPUP_TITLE}>{drawn.title}</p>}
              body={<p className={POPUP_TEXT}>{drawn.text}</p>}
              detail={drawn.detail}
              imageUrl={imageUrl}
              code={code}
              action={{ label: drawn.buttonLabel, href: "" }}
            />
          </div>
        </div>
      ) : null}
    </section>
  )
}
