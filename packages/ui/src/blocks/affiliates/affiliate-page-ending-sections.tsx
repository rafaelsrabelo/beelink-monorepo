"use client"

// React
import { useId } from "react"

// UI
import { Checkbox } from "@harness-monorepo/ui/components/checkbox"
import { Field, FieldLabel } from "@harness-monorepo/ui/components/field"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AFFILIATE_PAGE_MAX, type AffiliatePageContentValues, type AffiliatePageIssues, type AffiliatePageTextKey } from "@harness-monorepo/ui/lib/affiliate-page"
import { AffiliatePageSection } from "./affiliate-page-section"
import { AffiliatePageTextField } from "./affiliate-page-text-field"

/** The parts of the page after its lists, each with its own way back to the product's texts. */
export type AffiliatePageEndingPart = "closing" | "form" | "banner"

export interface AffiliatePageEndingSectionsProps {
  value: AffiliatePageContentValues
  onChange: (patch: Partial<AffiliatePageContentValues>) => void
  onRestore: (part: AffiliatePageEndingPart) => void
  issues?: AffiliatePageIssues
  disabled?: boolean
  messages?: UiMessages
}

/**
 * The page's closing call, its form — heading, the optional extra question and the message after
 * sending; what it always asks is said, not edited — and the shop window's banner (plan 2026-11-14).
 */
export function AffiliatePageEndingSections({ value, onChange, onRestore, issues = {}, disabled = false, messages = defaultMessages }: AffiliatePageEndingSectionsProps) {
  const text = messages.affiliatePage.editor
  const id = useId()
  const field = (key: AffiliatePageTextKey & keyof typeof AFFILIATE_PAGE_MAX, label: string, rows?: number) => (
    <AffiliatePageTextField id={`${id}-${key}`} label={label} value={value[key]} max={AFFILIATE_PAGE_MAX[key]} rows={rows} issue={issues[key]} disabled={disabled} onChange={(typed) => onChange({ [key]: typed })} messages={messages} />
  )

  return (
    <>
      <AffiliatePageSection title={text.closing.title} restoreLabel={text.restore} onRestore={() => onRestore("closing")} disabled={disabled}>
        {field("closingTitle", text.closing.heading)}
        {field("closingText", text.closing.text, 2)}
      </AffiliatePageSection>

      <AffiliatePageSection title={text.form.title} restoreLabel={text.restore} onRestore={() => onRestore("form")} disabled={disabled}>
        {field("formTitle", text.form.heading)}
        {field("formSubtitle", text.form.subtitle)}
        <p className="text-muted-foreground text-sm">{text.form.fixed}</p>
        <Field orientation="horizontal">
          <Checkbox id={`${id}-ask`} checked={value.askExtraQuestion} disabled={disabled} onCheckedChange={(askExtraQuestion: boolean) => onChange({ askExtraQuestion })} />
          <FieldLabel htmlFor={`${id}-ask`} className="font-normal">
            {text.form.askExtra}
          </FieldLabel>
        </Field>
        {value.askExtraQuestion ? field("extraQuestion", text.form.extraQuestion) : null}
        {field("successMessage", text.form.success, 3)}
        <p className="text-muted-foreground text-sm">{text.form.privacy}</p>
      </AffiliatePageSection>

      <AffiliatePageSection title={text.banner.title} restoreLabel={text.restore} onRestore={() => onRestore("banner")} disabled={disabled}>
        {field("bannerTitle", text.banner.heading)}
        {field("bannerText", text.banner.text, 2)}
        {field("bannerCta", text.banner.cta)}
      </AffiliatePageSection>
    </>
  )
}
