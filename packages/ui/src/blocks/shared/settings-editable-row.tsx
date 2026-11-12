// React
import type { ReactNode } from "react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"

// Block
import { SettingsRow } from "./settings-row"

export interface SettingsEditableRowProps {
  label: string
  hint?: string
  /** The value as read, while not editing. */
  display: ReactNode
  editing: boolean
  /** The field that takes the place of the value while editing, already labelled by its row. */
  field: ReactNode
  /** A refusal of what was typed, under the field. */
  issue?: string
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
  pending?: boolean
  /** Another row is being edited, or something else is in flight: no second Editar. */
  disabled?: boolean
  labels: { edit: string; save: string; saving: string; cancel: string }
}

/**
 * A settings row whose value is changed in place: Editar turns the value into its field, with Salvar
 * and Cancelar under it; Enter in a one-line field saves.
 */
export function SettingsEditableRow({ label, hint, display, editing, field, issue, onEdit, onSave, onCancel, pending = false, disabled = false, labels }: SettingsEditableRowProps) {
  if (!editing) {
    return (
      <SettingsRow
        label={label}
        hint={hint}
        action={
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={onEdit}>
            {labels.edit}
          </Button>
        }
      >
        {display}
      </SettingsRow>
    )
  }

  return (
    <SettingsRow label={label} hint={hint}>
      <form
        noValidate
        className="flex max-w-md flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          onSave()
        }}
      >
        {field}
        {issue ? (
          <p role="alert" className="text-destructive text-sm">
            {issue}
          </p>
        ) : null}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? labels.saving : labels.save}
          </Button>
          <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={onCancel}>
            {labels.cancel}
          </Button>
        </div>
      </form>
    </SettingsRow>
  )
}
