"use client"

// React
import { useId } from "react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AFFILIATE_PAGE_MAX, type AffiliatePageContentValues, type AffiliatePageIssues, type AffiliatePagePairListKey } from "@harness-monorepo/ui/lib/affiliate-page"
import { AffiliatePagePairsField } from "./affiliate-page-pairs-field"
import { AffiliatePageSection } from "./affiliate-page-section"
import { AffiliatePageTextField } from "./affiliate-page-text-field"

export interface AffiliatePageListsSectionProps {
  /** Which list this section edits. */
  list: AffiliatePagePairListKey
  value: AffiliatePageContentValues
  onChange: (patch: Partial<AffiliatePageContentValues>) => void
  onRestore: () => void
  issues?: AffiliatePageIssues
  disabled?: boolean
  messages?: UiMessages
}

/**
 * One list of the page in the editor (plan 2026-11-14): "how it works" — its heading and one to four
 * steps — the benefits, up to six, or the questions — their heading and up to ten. An empty list of
 * benefits or questions is a section the page leaves out; a page always says how it works.
 */
export function AffiliatePageListsSection({ list, value, onChange, onRestore, issues = {}, disabled = false, messages = defaultMessages }: AffiliatePageListsSectionProps) {
  const text = messages.affiliatePage.editor
  const id = useId()
  const shared = { name: list, issues, disabled, messages, onChange: (items: AffiliatePageContentValues[typeof list]) => onChange({ [list]: items }) }
  const heading = (key: "stepsTitle" | "questionsTitle", label: string) => (
    <AffiliatePageTextField id={`${id}-${key}`} label={label} value={value[key]} max={AFFILIATE_PAGE_MAX.sectionTitle} issue={issues[key]} disabled={disabled} onChange={(typed) => onChange({ [key]: typed })} messages={messages} />
  )

  if (list === "steps") {
    return (
      <AffiliatePageSection title={text.steps.title} restoreLabel={text.restore} onRestore={onRestore} disabled={disabled}>
        {heading("stepsTitle", text.steps.heading)}
        <AffiliatePagePairsField {...shared} items={value.steps} min={1} max={AFFILIATE_PAGE_MAX.steps} itemLabel={text.steps.item} firstLabel={text.steps.itemTitle} secondLabel={text.steps.itemText} firstMax={AFFILIATE_PAGE_MAX.itemTitle} secondMax={AFFILIATE_PAGE_MAX.itemText} />
      </AffiliatePageSection>
    )
  }

  if (list === "benefits") {
    return (
      <AffiliatePageSection title={text.benefits.title} restoreLabel={text.restore} onRestore={onRestore} disabled={disabled}>
        <AffiliatePagePairsField
          {...shared}
          items={value.benefits}
          min={0}
          max={AFFILIATE_PAGE_MAX.benefits}
          itemLabel={text.benefits.item}
          firstLabel={text.benefits.itemTitle}
          secondLabel={text.benefits.itemText}
          firstMax={AFFILIATE_PAGE_MAX.itemTitle}
          secondMax={AFFILIATE_PAGE_MAX.itemText}
          emptyNote={text.benefits.none}
        />
      </AffiliatePageSection>
    )
  }

  return (
    <AffiliatePageSection title={text.questions.title} restoreLabel={text.restore} onRestore={onRestore} disabled={disabled}>
      {heading("questionsTitle", text.questions.heading)}
      <AffiliatePagePairsField
        {...shared}
        items={value.questions}
        min={0}
        max={AFFILIATE_PAGE_MAX.questions}
        itemLabel={text.questions.item}
        firstLabel={text.questions.question}
        secondLabel={text.questions.answer}
        firstMax={AFFILIATE_PAGE_MAX.question}
        secondMax={AFFILIATE_PAGE_MAX.answer}
        secondRows={3}
        emptyNote={text.questions.none}
      />
    </AffiliatePageSection>
  )
}
