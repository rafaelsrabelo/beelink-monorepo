"use client"

// Libs
import { PlusIcon, Trash2Icon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Field, FieldContent, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { BenefitIcon, DEFAULT_BENEFIT_ICON, benefitIconNames } from "./benefit-icons"

/** One promise, as the form holds it. `""` where the wire carries null. */
export interface BenefitValue {
  id: string
  icon: string
  title: string
  detail: string
}

export interface BenefitRowsFieldProps {
  value: readonly BenefitValue[]
  onChange: (value: BenefitValue[]) => void
  /** Ids are the screen's to mint — this package has no clock and no randomness of its own. */
  newRowId: () => string
  messages?: UiMessages
}

/**
 * The band of promises, as its owner writes it.
 *
 * It used to be derived — four fixed rows keyed by the shop's payment methods, with the platform's
 * words. This is what makes it editable, which is what was asked for twice: "quero que seja
 * possível editar os Benefits", and then again as "ainda não consigo editar vantagens".
 */
export function BenefitRowsField({
  value,
  onChange,
  newRowId,
  messages = defaultMessages,
}: BenefitRowsFieldProps) {
  const text = messages.design
  const icons = benefitIconNames()

  const set = (at: number, next: Partial<BenefitValue>) =>
    onChange(value.map((row, index) => (index === at ? { ...row, ...next } : row)))

  return (
    <div className="flex flex-col gap-4">
      {value.map((row, at) => {
        const name = row.title.trim() || format(text.benefitPosition, { position: String(at + 1) })

        return (
          <div key={row.id} className="border-shell-border flex flex-col gap-3 rounded-xl border p-3">
            <div className="flex items-start justify-between gap-2">
              <Field>
                <FieldLabel htmlFor={`benefit-title-${row.id}`}>{text.benefitTitle}</FieldLabel>
                <FieldContent>
                  <Input
                    id={`benefit-title-${row.id}`}
                    value={row.title}
                    onChange={(event) => set(at, { title: event.target.value })}
                  />
                </FieldContent>
              </Field>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`${text.deleteBlock}: ${name}`}
                onClick={() => onChange(value.filter((_, index) => index !== at))}
              >
                <Trash2Icon aria-hidden="true" className="size-4" />
              </Button>
            </div>

            <Field>
              <FieldLabel htmlFor={`benefit-detail-${row.id}`}>{text.benefitDetail}</FieldLabel>
              <FieldContent>
                <Input
                  id={`benefit-detail-${row.id}`}
                  value={row.detail}
                  onChange={(event) => set(at, { detail: event.target.value })}
                />
              </FieldContent>
            </Field>

            {/*
              A grid of buttons and not a select: an icon is chosen by looking at it, and a list of
              names like "qr-code" would ask the shopkeeper to translate before they can pick.
            */}
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium">{text.benefitIcon}</legend>
              <div className="flex flex-wrap gap-1">
                {icons.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    aria-label={icon}
                    aria-pressed={row.icon === icon}
                    onClick={() => set(at, { icon })}
                    className={cn(
                      "focus-visible:ring-ring flex size-9 items-center justify-center rounded-md border outline-none focus-visible:ring-2",
                      row.icon === icon
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-shell-border text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <BenefitIcon name={icon} className="size-4" />
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        )
      })}

      <Button
        type="button"
        variant="outline"
        onClick={() =>
          onChange([...value, { id: newRowId(), icon: DEFAULT_BENEFIT_ICON, title: "", detail: "" }])
        }
      >
        <PlusIcon aria-hidden="true" className="size-4" />
        {text.addBenefit}
      </Button>
    </div>
  )
}
