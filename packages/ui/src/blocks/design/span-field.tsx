"use client"

// Libs
import { Columns2Icon, Columns3Icon, PanelRightIcon, RectangleHorizontalIcon } from "lucide-react"

// UI
import { ToggleGroup, ToggleGroupItem } from "@harness-monorepo/ui/components/toggle-group"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { STOREFRONT_SPANS, type StorefrontSpan } from "../storefront/storefront-band-cell"
import type { SectionWidth } from "./design-types"

const GLYPH: Record<StorefrontSpan, typeof Columns2Icon> = {
  FULL: RectangleHorizontalIcon,
  TWO_THIRDS: PanelRightIcon,
  HALF: Columns2Icon,
  THIRD: Columns3Icon,
}

/** Widest first, so the row reads the way the slices shrink. */
const ORDER: readonly StorefrontSpan[] = ["FULL", "TWO_THIRDS", "HALF", "THIRD"]

export interface SpanFieldProps {
  value: StorefrontSpan
  onChange: (value: StorefrontSpan) => void
  /** The block's name, so four identical groups in one list are told apart by a screen reader. */
  name?: string
  /** The band's own width, said beside the block's. Absent where the band is not known. */
  bandWidth?: SectionWidth
  messages?: UiMessages
}

/**
 * A block's slice of its band: the whole of it, two thirds, a half or a third.
 *
 * The one place a block's width is chosen. The banner's sheet used to hold a second "Tamanho"
 * that wrote the same column behind the draft's back, and "Tamanho" beside the band's own
 * "Largura" read as one setting in two places — so this says whose width it is, and the band's is
 * said right next to it in words of its own.
 *
 * Glyphs, because four words do not fit beside a block's name in a 380px panel; each carries the
 * slice as its name and its hover title, and the chosen one is written out beside them, so the
 * owner never has to hover to know what the block is.
 */
export function SpanField({ value, onChange, name, bandWidth, messages = defaultMessages }: SpanFieldProps) {
  const text = messages.design
  const label: Record<StorefrontSpan, string> = {
    FULL: text.spanFull,
    TWO_THIRDS: text.spanTwoThirds,
    HALF: text.spanHalf,
    THIRD: text.spanThird,
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <ToggleGroup
        multiple={false}
        aria-label={name ? `${text.spanLabel}: ${name}` : text.spanLabel}
        variant="outline"
        size="sm"
        value={[value]}
        onValueChange={(next: string[]) => {
          const chosen = STOREFRONT_SPANS.find((span) => span === next[0])
          if (chosen) onChange(chosen)
        }}
      >
        {ORDER.map((span) => {
          const Glyph = GLYPH[span]
          return (
            <ToggleGroupItem key={span} value={span} aria-label={label[span]} title={label[span]}>
              <Glyph aria-hidden="true" className="size-4" />
            </ToggleGroupItem>
          )
        })}
      </ToggleGroup>

      <p className="text-muted-foreground text-xs">
        <span className="text-foreground font-medium">{label[value]}</span>
        {bandWidth ? (
          <>
            {" · "}
            {text.spanBandLabel}: {bandWidth === "FULL" ? text.bandWidthFull : text.bandWidthContained}
          </>
        ) : null}
      </p>
    </div>
  )
}
