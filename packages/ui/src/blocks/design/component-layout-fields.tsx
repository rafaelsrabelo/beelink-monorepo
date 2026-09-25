"use client"

// UI
import { FieldDescription, FieldLabel, FieldSet } from "@harness-monorepo/ui/components/field"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AlignField } from "./align-field"
import { hasSpan, type ArrangementSpan } from "./arrangement-row"
import { ColumnsField } from "./columns-field"
import type { ComponentDisplay, ComponentKind, SectionWidth } from "./design-types"
import { DisplayField } from "./display-field"
import { SpanField } from "./span-field"
import type { TextAlign } from "./text-align"

/** How a block sits, as the page draws it: every null already resolved to the kind's own habit. */
export interface ComponentLayoutValues {
  span: ArrangementSpan
  /** Null on a kind that lays nothing out. */
  display: ComponentDisplay | null
  /** `0` is "let the grid decide", which is what null means on the wire. */
  columns: number
  align: TextAlign
}

export interface ComponentLayoutFieldsProps {
  kind: ComponentKind
  value: ComponentLayoutValues
  onChange: (next: Partial<ComponentLayoutValues>) => void
  /** The band's own width, said beside the block's so the two are never taken for one setting. */
  bandWidth: SectionWidth
  messages?: UiMessages
}

/**
 * The formats each kind draws, in the order offered. Mirrors the API's `DISPLAYS_OF_KIND`
 * (apps/api/src/modules/page/page.constants.ts): a format the API refuses is one never offered.
 */
export const DISPLAYS_OF_KIND: Partial<Record<ComponentKind, readonly ComponentDisplay[]>> = {
  BANNER: ["CAROUSEL", "GRID"],
  PRODUCTS: ["RAIL", "GRID"],
  CATEGORIES: ["RAIL", "GRID"],
}

/** The grids that ask how many across. A banner's grid is its pictures side by side, sized by the band. */
const HAS_COLUMNS: readonly ComponentKind[] = ["PRODUCTS", "CATEGORIES"]

/** The strip above the header is drawn outside the band's grid, so it has nothing to lay out. */
export function hasLayout(kind: ComponentKind): boolean {
  return hasSpan({ kind })
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
  const displays = DISPLAYS_OF_KIND[kind]

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
        <div className="flex flex-col gap-2">
          <DisplayField
            value={value.display}
            options={displays}
            onChange={(display) => onChange({ display })}
            messages={messages}
          />
          {kind === "CATEGORIES" ? (
            <FieldDescription>{value.display === "RAIL" ? text.categoriesRailHint : text.categoriesGridHint}</FieldDescription>
          ) : null}
        </div>
      ) : null}

      {/* Asked only of a grid: a rail's cards have a width of their own at every screen. */}
      {HAS_COLUMNS.includes(kind) && value.display === "GRID" ? (
        <ColumnsField value={value.columns} onChange={(columns) => onChange({ columns })} messages={messages} />
      ) : null}

      {kind === "HEADING" || kind === "TEXT" ? (
        <AlignField value={value.align} onChange={(align) => onChange({ align })} messages={messages} />
      ) : null}
    </>
  )
}
