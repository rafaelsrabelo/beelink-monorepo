"use client"

// Libs
import { ChevronDownIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { FieldDescription, FieldLabel, FieldSet } from "@harness-monorepo/ui/components/field"
import { layoutsOf } from "@harness-monorepo/ui/lib/section-registry"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AlignField } from "./align-field"
import { hasSpan, type ArrangementSpan } from "./arrangement-row"
import { ColumnsField } from "./columns-field"
import type { ComponentDisplay, ComponentKind, DeviceVisibility, SectionWidth } from "./design-types"
import { LayoutPicker } from "./layout-picker"
import { LayoutThumbnail } from "./layout-thumbnail"
import { SpanField } from "./span-field"
import type { TextAlign } from "./text-align"
import { VisibleOnField } from "./visible-on-field"

/** How a block sits, as the page draws it: every null already resolved to the kind's own habit. */
export interface ComponentLayoutValues {
  span: ArrangementSpan
  /** Null on a kind that lays nothing out. */
  display: ComponentDisplay | null
  /** `0` is "let the grid decide", which is what null means on the wire. */
  columns: number
  align: TextAlign
  visibleOn: DeviceVisibility
}

export interface ComponentLayoutFieldsProps {
  kind: ComponentKind
  value: ComponentLayoutValues
  onChange: (next: Partial<ComponentLayoutValues>) => void
  /** The band's own width, said beside the block's so the two are never taken for one setting. */
  bandWidth: SectionWidth
  messages?: UiMessages
}

/** The grids that ask how many across. A banner's grid is its pictures side by side, sized by the band. */
const HAS_COLUMNS: readonly ComponentKind[] = ["PRODUCTS", "CATEGORIES"]

/**
 * Whether a kind has a Layout tab: a slice of its band, or a look to choose. The strip has no slice —
 * it is drawn above the header, outside the grid — but it is still or scrolling.
 */
export function hasLayout(kind: ComponentKind): boolean {
  return hasSpan({ kind }) || layoutsOf(kind) !== undefined
}

/**
 * How a block sits: its slice of the band, the format it lays its things out in, how many across
 * when that is a grid, and where its words align.
 *
 * All of it waits in the draft for Publicar, beside the order and the visibility — which is why it
 * is a tab of its own and says so, apart from the words and the band's colour that Salvar sends.
 */
export function ComponentLayoutFields({
  kind,
  value,
  onChange,
  bandWidth,
  messages = defaultMessages,
}: ComponentLayoutFieldsProps) {
  const text = messages.design
  const displays = layoutsOf(kind)

  return (
    <>
      <p className="text-muted-foreground text-xs">{text.inspector.layoutNote}</p>

      {hasSpan({ kind }) ? (
        <FieldSet>
          <FieldLabel>{text.spanLabel}</FieldLabel>
          <SpanField value={value.span} onChange={(span) => onChange({ span })} bandWidth={bandWidth} messages={messages} />
        </FieldSet>
      ) : null}

      {displays && value.display ? (
        <FieldSet>
          <FieldLabel>{text.displayLabel}</FieldLabel>
          <LayoutPicker
            layouts={displays}
            value={value.display}
            onChange={(display) => onChange({ display })}
            label={text.displayLabel}
            trigger={
              <Button
                type="button"
                variant="outline"
                aria-label={`${text.displayLabel}: ${text.displays[value.display]}`}
                className="h-auto w-full justify-between gap-3 p-2"
              >
                <span className="flex items-center gap-3">
                  <LayoutThumbnail display={value.display} />
                  <span className="text-sm font-medium">{text.displays[value.display]}</span>
                </span>
                <ChevronDownIcon aria-hidden="true" className="size-4 opacity-60" />
              </Button>
            }
            messages={messages}
          />
          {kind === "CATEGORIES" && value.display !== "CHIPS" ? (
            <FieldDescription>{value.display === "RAIL" ? text.categoriesRailHint : text.categoriesGridHint}</FieldDescription>
          ) : null}
        </FieldSet>
      ) : null}

      {/* Asked only of a grid: a rail's cards have a width of their own at every screen. */}
      {HAS_COLUMNS.includes(kind) && value.display === "GRID" ? (
        <ColumnsField value={value.columns} onChange={(columns) => onChange({ columns })} messages={messages} />
      ) : null}

      {kind === "HEADING" || kind === "TEXT" ? (
        <AlignField value={value.align} onChange={(align) => onChange({ align })} messages={messages} />
      ) : null}

      {/* The strip shows everywhere: the API refuses it anything else. */}
      {hasSpan({ kind }) ? (
        <VisibleOnField value={value.visibleOn} onChange={(visibleOn) => onChange({ visibleOn })} messages={messages} />
      ) : null}
    </>
  )
}
