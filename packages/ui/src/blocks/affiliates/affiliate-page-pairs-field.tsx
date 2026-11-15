// React
import { useId } from "react"

// Libs
import { PlusIcon, Trash2Icon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { FieldLegend, FieldSet } from "@harness-monorepo/ui/components/field"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { AffiliatePageIssues, AffiliatePagePairValue } from "@harness-monorepo/ui/lib/affiliate-page"
import { AffiliatePageTextField } from "./affiliate-page-text-field"

export interface AffiliatePagePairsFieldProps {
  /** Where its refusals are kept: `steps` reads `steps.0.title`. */
  name: string
  items: readonly AffiliatePagePairValue[]
  onChange: (items: AffiliatePagePairValue[]) => void
  min: number
  max: number
  /** `{n}`: one item's heading, "Passo 2". */
  itemLabel: string
  firstLabel: string
  secondLabel: string
  firstMax: number
  secondMax: number
  /** The second text is a paragraph — an answer. */
  secondRows?: number
  /** Said when the list is empty, which hides its section on the page. */
  emptyNote?: string
  issues?: AffiliatePageIssues
  disabled?: boolean
  messages?: UiMessages
}

/**
 * A list of the page's items, two texts each — the steps, the benefits, the questions (plan
 * 2026-11-14): added at the end up to the list's most, and each removed while more than its least.
 */
export function AffiliatePagePairsField({ name, items, onChange, min, max, itemLabel, firstLabel, secondLabel, firstMax, secondMax, secondRows, emptyNote, issues = {}, disabled = false, messages = defaultMessages }: AffiliatePagePairsFieldProps) {
  const text = messages.affiliatePage.editor
  const id = useId()
  const replace = (index: number, patch: Partial<AffiliatePagePairValue>) => onChange(items.map((item, at) => (at === index ? { ...item, ...patch } : item)))

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 && emptyNote ? <p className="text-muted-foreground text-sm">{emptyNote}</p> : null}
      {items.map((item, index) => {
        const heading = format(itemLabel, { n: String(index + 1) })
        return (
          // The position is the item's identity: the shop's list has no ids, and an item is its place in it.
          <FieldSet key={index} className="rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <FieldLegend variant="label">{heading}</FieldLegend>
              {items.length > min ? (
                <Button type="button" variant="ghost" size="icon-sm" disabled={disabled} aria-label={format(text.remove, { n: heading })} onClick={() => onChange(items.filter((_, at) => at !== index))}>
                  <Trash2Icon aria-hidden="true" />
                </Button>
              ) : null}
            </div>
            <AffiliatePageTextField id={`${id}-${index}-a`} label={firstLabel} value={item.title} max={firstMax} issue={issues[`${name}.${index}.title`]} disabled={disabled} onChange={(title) => replace(index, { title })} messages={messages} />
            <AffiliatePageTextField id={`${id}-${index}-b`} label={secondLabel} value={item.text} max={secondMax} rows={secondRows} issue={issues[`${name}.${index}.text`]} disabled={disabled} onChange={(value) => replace(index, { text: value })} messages={messages} />
          </FieldSet>
        )
      })}
      {items.length < max ? (
        <Button type="button" variant="outline" className="self-start" disabled={disabled} onClick={() => onChange([...items, { title: "", text: "" }])}>
          <PlusIcon aria-hidden="true" />
          {text.add}
        </Button>
      ) : null}
    </div>
  )
}
