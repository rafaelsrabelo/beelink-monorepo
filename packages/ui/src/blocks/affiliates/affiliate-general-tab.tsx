"use client"

// UI
import { Avatar, AvatarFallback, AvatarImage } from "@harness-monorepo/ui/components/avatar"
import { Button } from "@harness-monorepo/ui/components/button"
import { Input } from "@harness-monorepo/ui/components/input"
import { Textarea } from "@harness-monorepo/ui/components/textarea"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { initialsOf, type AffiliateRecordView } from "@harness-monorepo/ui/lib/affiliates"
import { maskCpf } from "@harness-monorepo/ui/lib/cpf"
import { SettingsEditableRow } from "../shared/settings-editable-row"
import { SettingsRow } from "../shared/settings-row"
import { SettingsSection } from "../shared/settings-section"

/** What the shop changes of an affiliate in place: the rest is theirs, or the account's. */
export type AffiliateEditableField = "phone" | "cpf" | "note"

export interface AffiliateGeneralTabProps {
  affiliate: AffiliateRecordView
  /** Invited before the phone and the CPF were asked: say so, so the shop completes them. */
  identityMissing?: boolean
  editing: AffiliateEditableField | null
  /** What is typed in the field being edited. */
  draft: string
  onEdit: (field: AffiliateEditableField) => void
  onDraft: (text: string) => void
  onSave: () => void
  onCancel: () => void
  /** A refusal of what was typed. */
  issue?: string
  pending?: boolean
  onRemovePhoto: () => void
  onRemoveTagline: () => void
  removing?: "photo" | "tagline" | null
  /** The API's refusal, in words. */
  error?: string
  messages?: UiMessages
}

/**
 * The record's "Geral" tab (12/11/2026): who the affiliate is, as rows of label · value · action —
 * the phone, the CPF and the note changed in place, the photo and the phrase taken off the showcase.
 */
export function AffiliateGeneralTab({ affiliate, identityMissing = false, editing, draft, onEdit, onDraft, onSave, onCancel, issue, pending = false, onRemovePhoto, onRemoveTagline, removing = null, error, messages = defaultMessages }: AffiliateGeneralTabProps) {
  const text = messages.affiliates.record
  const showcase = messages.affiliates.showcase
  const labels = { edit: text.edit, save: text.save, saving: text.saving, cancel: text.cancelEdit }
  const none = <span className="text-muted-foreground">{text.none}</span>
  const editable = (field: AffiliateEditableField) => ({
    editing: editing === field,
    onEdit: () => onEdit(field),
    onSave,
    onCancel,
    issue: editing === field ? issue : undefined,
    pending,
    disabled: editing !== null || pending,
    labels,
  })

  return (
    <div className="flex flex-col gap-8">
      <SettingsSection title={text.dataTitle} description={identityMissing ? text.identityMissing : undefined}>
        <SettingsRow
          label={text.photo}
          hint={showcase.help}
          action={
            affiliate.photoUrl ? (
              <Button type="button" variant="outline" size="sm" disabled={removing !== null} onClick={onRemovePhoto}>
                {showcase.removePhoto}
              </Button>
            ) : null
          }
        >
          <Avatar className="size-12">
            {affiliate.photoUrl ? <AvatarImage src={affiliate.photoUrl} alt={format(showcase.photoAlt, { name: affiliate.name })} /> : null}
            <AvatarFallback>{initialsOf(affiliate.name)}</AvatarFallback>
          </Avatar>
        </SettingsRow>
        <SettingsRow label={text.name}>{affiliate.name}</SettingsRow>
        <SettingsRow label={text.email}>{affiliate.email}</SettingsRow>
        <SettingsEditableRow
          label={text.phone}
          hint={text.phoneHelp}
          display={affiliate.phone ?? none}
          field={<Input type="tel" inputMode="tel" autoComplete="off" autoFocus aria-label={text.phone} aria-invalid={issue ? true : undefined} value={draft} onChange={(event) => onDraft(event.target.value)} />}
          {...editable("phone")}
        />
        <SettingsEditableRow
          label={text.cpf}
          hint={text.cpfHelp}
          display={affiliate.cpf ?? none}
          field={<Input inputMode="numeric" autoComplete="off" autoFocus aria-label={text.cpf} aria-invalid={issue ? true : undefined} value={draft} onChange={(event) => onDraft(maskCpf(event.target.value))} />}
          {...editable("cpf")}
        />
        <SettingsRow label={text.link}>{affiliate.link ? <span className="font-mono text-[13px] break-all">{affiliate.link}</span> : <span className="text-muted-foreground">{text.linkPending}</span>}</SettingsRow>
        <SettingsRow label={text.pixKey}>{affiliate.pixKey ?? none}</SettingsRow>
        <SettingsRow
          label={showcase.tagline}
          action={
            affiliate.tagline ? (
              <Button type="button" variant="outline" size="sm" disabled={removing !== null} onClick={onRemoveTagline}>
                {showcase.removeTagline}
              </Button>
            ) : null
          }
        >
          {affiliate.tagline ?? <span className="text-muted-foreground">{showcase.noTagline}</span>}
        </SettingsRow>
        {affiliate.terms ? <SettingsRow label={text.terms}>{affiliate.terms}</SettingsRow> : null}
        <SettingsEditableRow
          label={text.note}
          hint={text.noteHelp}
          display={affiliate.note ? <span className="whitespace-pre-line">{affiliate.note}</span> : none}
          field={<Textarea rows={3} autoFocus aria-label={text.note} aria-invalid={issue ? true : undefined} value={draft} onChange={(event) => onDraft(event.target.value)} />}
          {...editable("note")}
        />
        <SettingsRow label={text.dates}>
          <ul className="flex flex-col gap-0.5">
            {affiliate.history.map((line) => (
              <li key={line}>{line}</li>
            ))}
            {affiliate.invite ? <li className="text-muted-foreground">{affiliate.invite}</li> : null}
          </ul>
        </SettingsRow>
      </SettingsSection>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  )
}
