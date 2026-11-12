"use client"

// React
import type { ReactNode } from "react"

// Icons
import { ChevronLeftIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Separator } from "@harness-monorepo/ui/components/separator"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { AffiliateWizardStepView } from "@harness-monorepo/ui/lib/affiliate-wizard"
import { AffiliateWizardStepper } from "./affiliate-wizard-stepper"

export interface AffiliateWizardFrameProps {
  steps: readonly AffiliateWizardStepView[]
  onStep: (index: number) => void
  title: string
  subtitle: string
  card: { icon: ReactNode; title: string; description: string }
  children: ReactNode
  /** Back, when there is a step before; and the step's own move — "Continuar", or "Enviar convite". */
  onBack?: () => void
  primary: string
  onPrimary: () => void
  pending?: boolean
  /** The API's refusal, in words. */
  error?: string
  /** The commission's tree needs the room. */
  wide?: boolean
  messages?: UiMessages
}

/**
 * One step of the invite (the user's design, 12/11/2026): the steps beside it, a centred title and
 * a line under it, and a card — its icon, its name, what it is for — with the step's fields and,
 * under a rule, Back and the step's move, side by side across the card.
 */
export function AffiliateWizardFrame({ steps, onStep, title, subtitle, card, children, onBack, primary, onPrimary, pending = false, error, wide = false, messages = defaultMessages }: AffiliateWizardFrameProps) {
  const text = messages.affiliates.wizard

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:gap-10">
      <AffiliateWizardStepper steps={steps} onStep={onStep} messages={messages} />

      <div className="flex min-w-0 flex-1 flex-col items-center gap-6">
        <header className="flex max-w-xl flex-col gap-2 text-center">
          <h1 className="text-xl font-semibold text-balance sm:text-2xl">{title}</h1>
          <p className="text-muted-foreground text-sm">{subtitle}</p>
        </header>

        <form
          noValidate
          className={cn("bg-shell-surface border-shell-border flex w-full flex-col gap-5 rounded-2xl border p-5 shadow-xs sm:p-6", wide ? "max-w-3xl" : "max-w-2xl")}
          onSubmit={(event) => {
            event.preventDefault()
            onPrimary()
          }}
        >
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="bg-brand-yellow/20 text-brand-ink grid size-10 shrink-0 place-items-center rounded-full">
              {card.icon}
            </span>
            <div className="flex flex-col">
              <h2 className="font-semibold">{card.title}</h2>
              <p className="text-muted-foreground text-xs">{card.description}</p>
            </div>
          </div>
          <Separator />

          {children}

          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}

          <Separator />
          <div className={cn("grid gap-3", onBack ? "grid-cols-2" : "grid-cols-1")}>
            {onBack ? (
              <Button type="button" variant="outline" size="lg" disabled={pending} onClick={onBack}>
                <ChevronLeftIcon aria-hidden="true" />
                {text.back}
              </Button>
            ) : null}
            <Button type="submit" size="lg" disabled={pending}>
              {primary}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
