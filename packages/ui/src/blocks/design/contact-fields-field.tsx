"use client"

// Libs
import { PlusIcon, Trash2Icon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Checkbox } from "@harness-monorepo/ui/components/checkbox"
import { Field, FieldContent, FieldDescription, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@harness-monorepo/ui/components/select"
import { Textarea } from "@harness-monorepo/ui/components/textarea"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { CONTACT_FIELD_TYPES, type ContactFieldType } from "./design-types"

/** One field of a contact form, as the editor holds it. The choices are one per line. */
export interface ContactFieldValue {
  id: string
  label: string
  type: ContactFieldType
  required: boolean
  options: string
}

/**
 * Whether the form still has a way to answer whoever writes: a required e-mail or phone.
 *
 * The API refuses a form without one — this is the same rule said early, so the owner sees why
 * before pressing save rather than after.
 */
export function reachesBack(fields: readonly Pick<ContactFieldValue, "type" | "required">[]): boolean {
  return fields.some((field) => field.required && (field.type === "EMAIL" || field.type === "PHONE"))
}

export interface ContactFieldsFieldProps {
  value: readonly ContactFieldValue[]
  onChange: (value: ContactFieldValue[]) => void
  /** Ids are the screen's to mint — this package has no randomness of its own. */
  newFieldId: () => string
  messages?: UiMessages
}

/**
 * The questions a site's contact form asks, as its owner writes them.
 *
 * A closed set of types and nothing more — a label, a type, required or not, and the choices of a
 * list. Enough for "empresa, volume, data desejada" without becoming a form builder. The visitor's
 * name is not here: it is always asked, first, and saying so above the list stops the owner adding
 * it twice.
 */
export function ContactFieldsField({ value, onChange, newFieldId, messages = defaultMessages }: ContactFieldsFieldProps) {
  const text = messages.design.contact
  const set = (at: number, next: Partial<ContactFieldValue>) =>
    onChange(value.map((field, index) => (index === at ? { ...field, ...next } : field)))

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="text-sm font-medium">{text.fieldsLabel}</legend>
      <p className="text-muted-foreground -mt-2 text-sm">{text.fieldsHelp}</p>

      {value.map((field, at) => {
        const name = field.label.trim() || format(text.fieldPosition, { position: String(at + 1) })

        return (
          <div key={field.id} className="border-shell-border flex flex-col gap-3 rounded-xl border p-3">
            <div className="flex items-start gap-2">
              <Field>
                <FieldLabel htmlFor={`contact-label-${field.id}`}>{text.fieldLabel}</FieldLabel>
                <FieldContent>
                  <Input
                    id={`contact-label-${field.id}`}
                    value={field.label}
                    onChange={(event) => set(at, { label: event.target.value })}
                  />
                </FieldContent>
              </Field>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mt-6"
                aria-label={`${text.removeField}: ${name}`}
                onClick={() => onChange(value.filter((_, index) => index !== at))}
              >
                <Trash2Icon aria-hidden="true" className="size-4" />
              </Button>
            </div>

            <div className="flex flex-wrap items-end gap-4">
              <Field className="min-w-40 flex-1">
                <FieldLabel htmlFor={`contact-type-${field.id}`}>{text.fieldType}</FieldLabel>
                <FieldContent>
                  <Select
                    value={field.type}
                    onValueChange={(next: string | null) => set(at, { type: (next ?? "TEXT") as ContactFieldType })}
                  >
                    <SelectTrigger id={`contact-type-${field.id}`}>
                      <SelectValue>{(selected: string) => text.types[selected as ContactFieldType]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {CONTACT_FIELD_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {text.types[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>

              <Field orientation="horizontal" className="w-auto pb-2">
                <Checkbox
                  id={`contact-required-${field.id}`}
                  checked={field.required}
                  onCheckedChange={(checked: boolean) => set(at, { required: checked })}
                />
                <FieldLabel htmlFor={`contact-required-${field.id}`}>{text.fieldRequired}</FieldLabel>
              </Field>
            </div>

            {field.type === "SELECT" ? (
              <Field>
                <FieldLabel htmlFor={`contact-options-${field.id}`}>{text.fieldOptions}</FieldLabel>
                <FieldContent>
                  <Textarea
                    id={`contact-options-${field.id}`}
                    rows={3}
                    value={field.options}
                    onChange={(event) => set(at, { options: event.target.value })}
                  />
                  <FieldDescription>{text.fieldOptionsHelp}</FieldDescription>
                </FieldContent>
              </Field>
            ) : null}
          </div>
        )
      })}

      {reachesBack(value) ? null : (
        <p role="alert" className="text-destructive text-sm">
          {text.reachBack}
        </p>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={() =>
          onChange([...value, { id: newFieldId(), label: "", type: "TEXT", required: false, options: "" }])
        }
      >
        <PlusIcon aria-hidden="true" className="size-4" />
        {text.addField}
      </Button>
    </fieldset>
  )
}
