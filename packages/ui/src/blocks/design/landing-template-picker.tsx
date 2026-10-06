"use client"

// Libs
import { FileIcon, LayersIcon, RocketIcon, ZapIcon } from "lucide-react"

// UI
import { Badge } from "@harness-monorepo/ui/components/badge"
import { Button } from "@harness-monorepo/ui/components/button"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export type LandingTemplateChoice = "lancamento" | "promocao-relampago" | "colecao" | "em-branco"

/** How each model is drawn. Which models there are is not said here: the catalogue is the API's. */
const ICONS = { lancamento: RocketIcon, "promocao-relampago": ZapIcon, colecao: LayersIcon, "em-branco": FileIcon } as const

/** Whether an id the API listed is one this picker can draw — a newer catalogue may list one it cannot. */
export function isLandingTemplate(id: string): id is LandingTemplateChoice {
  return Object.hasOwn(ICONS, id)
}

/** A model as the catalogue offers it to this shop. */
export interface LandingTemplateOption {
  id: LandingTemplateChoice
  /** Built around a product, which the form then asks for. */
  needsProduct: boolean
  /** Suggested for the shop's category. It came first in the list; it hides nothing. */
  recommended?: boolean
}

export interface LandingTemplatePickerProps {
  /** Null while none is chosen: before the list arrives. */
  value: LandingTemplateChoice | null
  onChange: (value: LandingTemplateChoice) => void
  /** The models this shop may open a landing with, in the API's order. */
  templates: readonly LandingTemplateOption[]
  /** Whether they have arrived: grey cards on their way, a sentence when they could not be read. */
  state?: "loading" | "failed" | "ready"
  onRetry?: () => void
  messages?: UiMessages
}

/**
 * The template a landing opens with, as a set of cards that say what each builds. A radio group
 * under the hood — one choice, arrows between them — drawn as cards because the description is what
 * the choice is made on.
 */
export function LandingTemplatePicker({ value, onChange, templates, state = "ready", onRetry, messages = defaultMessages }: LandingTemplatePickerProps) {
  const text = messages.design.pages.form
  const gallery = messages.design.templateGallery

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">{text.template}</legend>
      {state === "loading" ? (
        <div role="status" aria-busy="true" className="grid gap-2 sm:grid-cols-2">
          <span className="sr-only">{gallery.loading}</span>
          {[0, 1, 2, 3].map((card) => (
            <Skeleton key={card} aria-hidden="true" className="h-18 w-full rounded-lg" />
          ))}
        </div>
      ) : state === "failed" ? (
        <div className="flex flex-col items-start gap-2">
          <p role="alert" className="text-destructive text-sm">
            {gallery.failed}
          </p>
          {onRetry ? (
            <Button type="button" size="sm" variant="outline" onClick={onRetry}>
              {gallery.retry}
            </Button>
          ) : null}
        </div>
      ) : templates.length === 0 ? (
        <p className="text-muted-foreground text-sm">{gallery.empty}</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {templates.map((template) => {
            const Icon = ICONS[template.id]
            const words = text.templates[template.id]

            return (
              <label
                key={template.id}
                className={cn(
                  "has-[:focus-visible]:ring-ring/50 flex cursor-pointer gap-3 rounded-lg border p-3 has-[:focus-visible]:ring-3",
                  value === template.id ? "border-primary bg-primary/5" : "border-border",
                )}
              >
                <input
                  type="radio"
                  name="landing-template"
                  value={template.id}
                  checked={value === template.id}
                  onChange={() => onChange(template.id)}
                  className="sr-only"
                />
                <Icon aria-hidden="true" className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                <span className="flex flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                    {words.title}
                    {template.recommended ? <Badge variant="secondary">{gallery.recommended}</Badge> : null}
                  </span>
                  <span className="text-muted-foreground text-xs">{words.description}</span>
                </span>
              </label>
            )
          })}
        </div>
      )}
      {state === "ready" && templates.length === 1 && templates[0]?.id === "em-branco" ? (
        <p className="text-muted-foreground text-xs">{text.siteBlankOnly}</p>
      ) : null}
    </fieldset>
  )
}
