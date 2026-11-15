"use client"

// React
import { useId } from "react"

// UI
import { FieldLegend, FieldSet } from "@harness-monorepo/ui/components/field"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AFFILIATE_PAGE_MAX, type AffiliatePageContentValues, type AffiliatePageIssues } from "@harness-monorepo/ui/lib/affiliate-page"
import { StoreImageField } from "../store/store-image-field"
import { AffiliatePageSection } from "./affiliate-page-section"
import { AffiliatePageTextField } from "./affiliate-page-text-field"

export interface AffiliatePageTopSectionProps {
  value: AffiliatePageContentValues
  onChange: (patch: Partial<AffiliatePageContentValues>) => void
  onRestore: () => void
  /** Sends a picture and answers its address; rejects when it was refused. */
  onUpload?: (file: File) => Promise<string>
  uploading?: boolean
  /** The upload's refusal, in words. */
  uploadError?: string
  issues?: AffiliatePageIssues
  disabled?: boolean
  messages?: UiMessages
}

/** The top of the page in the editor (plan 2026-11-14): its label, title, subtitle, button, up to three highlights and an image. */
export function AffiliatePageTopSection({ value, onChange, onRestore, onUpload, uploading = false, uploadError, issues = {}, disabled = false, messages = defaultMessages }: AffiliatePageTopSectionProps) {
  const text = messages.affiliatePage.editor
  const id = useId()
  // Always three boxes: one left blank is a highlight the page leaves out.
  const highlights = [0, 1, 2].map((index) => value.highlights[index] ?? "")
  const field = (key: "badge" | "title" | "subtitle" | "ctaLabel", label: string, rows?: number) => (
    <AffiliatePageTextField id={`${id}-${key}`} label={label} value={value[key]} max={AFFILIATE_PAGE_MAX[key]} rows={rows} issue={issues[key]} disabled={disabled} onChange={(typed) => onChange({ [key]: typed })} messages={messages} />
  )

  return (
    <AffiliatePageSection title={text.top.title} restoreLabel={text.restore} onRestore={onRestore} disabled={disabled}>
      {field("badge", text.top.badge)}
      {field("title", text.top.heading)}
      {field("subtitle", text.top.subtitle, 3)}
      {field("ctaLabel", text.top.cta)}
      <FieldSet>
        <FieldLegend variant="label">{text.top.highlights}</FieldLegend>
        {highlights.map((highlight, index) => (
          <AffiliatePageTextField
            key={index}
            id={`${id}-highlight-${index}`}
            label={format(text.top.highlight, { n: String(index + 1) })}
            value={highlight}
            max={AFFILIATE_PAGE_MAX.highlight}
            issue={issues[`highlights.${index}`]}
            disabled={disabled}
            onChange={(typed) => onChange({ highlights: highlights.map((current, at) => (at === index ? typed : current)) })}
            messages={messages}
          />
        ))}
      </FieldSet>
      <StoreImageField
        id={`${id}-image`}
        label={text.top.image}
        value={value.imageUrl ?? ""}
        onChange={(url) => onChange({ imageUrl: url || null })}
        onUpload={onUpload}
        pending={uploading}
        error={uploadError ? { message: uploadError } : undefined}
        hint={text.top.imageHelp}
        previewAlt={text.top.image}
        aspect="wide"
        disabled={disabled}
        messages={messages}
      />
    </AffiliatePageSection>
  )
}
