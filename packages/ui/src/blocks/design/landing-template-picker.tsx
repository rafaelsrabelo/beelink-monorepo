"use client"

// Libs
import { FileIcon, LayersIcon, RocketIcon, ZapIcon } from "lucide-react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export type LandingTemplateChoice = "lancamento" | "promocao-relampago" | "colecao" | "em-branco"

/** Every template, in the order the dialog offers them. */
export const LANDING_TEMPLATES: readonly LandingTemplateChoice[] = ["lancamento", "promocao-relampago", "colecao", "em-branco"]

const ICONS = { lancamento: RocketIcon, "promocao-relampago": ZapIcon, colecao: LayersIcon, "em-branco": FileIcon } as const

export interface LandingTemplatePickerProps {
  value: LandingTemplateChoice
  onChange: (value: LandingTemplateChoice) => void
  /** The ones this shop may open with; the others are drawn and cannot be chosen. */
  available: readonly LandingTemplateChoice[]
  messages?: UiMessages
}

/**
 * The template a landing opens with, as a set of cards that say what each builds. A radio group
 * under the hood — one choice, arrows between them — drawn as cards because the description is what
 * the choice is made on.
 */
export function LandingTemplatePicker({ value, onChange, available, messages = defaultMessages }: LandingTemplatePickerProps) {
  const text = messages.design.pages.form

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">{text.template}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {LANDING_TEMPLATES.map((template) => {
          const Icon = ICONS[template]
          const offered = available.includes(template)
          const words = text.templates[template]

          return (
            <label
              key={template}
              className={cn(
                "has-[:focus-visible]:ring-ring/50 flex cursor-pointer gap-3 rounded-lg border p-3 has-[:focus-visible]:ring-3",
                value === template ? "border-primary bg-primary/5" : "border-border",
                !offered && "cursor-not-allowed opacity-50",
              )}
            >
              <input
                type="radio"
                name="landing-template"
                value={template}
                checked={value === template}
                disabled={!offered}
                onChange={() => onChange(template)}
                className="sr-only"
              />
              <Icon aria-hidden="true" className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{words.title}</span>
                <span className="text-muted-foreground text-xs">{words.description}</span>
              </span>
            </label>
          )
        })}
      </div>
      {available.length === 1 && available[0] === "em-branco" ? (
        <p className="text-muted-foreground text-xs">{text.siteBlankOnly}</p>
      ) : null}
    </fieldset>
  )
}
