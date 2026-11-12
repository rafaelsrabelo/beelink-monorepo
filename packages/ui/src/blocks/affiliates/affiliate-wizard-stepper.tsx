// Icons
import { CheckIcon } from "lucide-react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { AffiliateWizardStepView } from "@harness-monorepo/ui/lib/affiliate-wizard"

export interface AffiliateWizardStepperProps {
  steps: readonly AffiliateWizardStepView[]
  /** A step already done is a way back to it; one still ahead is not. */
  onStep: (index: number) => void
  messages?: UiMessages
}

function Progress({ step, total, messages }: { step: number; total: number; messages: UiMessages }) {
  return (
    <div className="flex items-center gap-3">
      <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full" aria-hidden="true">
        <div className="bg-brand-yellow h-full rounded-full transition-[width] motion-reduce:transition-none" style={{ width: `${(step / total) * 100}%` }} />
      </div>
      <span className="text-muted-foreground text-xs font-medium tabular-nums">{format(messages.affiliates.wizard.progress, { step: String(step), total: String(total) })}</span>
    </div>
  )
}

/**
 * The invite's steps (the user's design, 12/11/2026): a column of them joined by a line — done
 * filled, the current one ringed, the rest empty — with the progress at its foot. Under 640px it
 * folds into a bar above the card: the step's name and the same progress.
 */
export function AffiliateWizardStepper({ steps, onStep, messages = defaultMessages }: AffiliateWizardStepperProps) {
  const text = messages.affiliates.wizard
  const current = Math.max(steps.findIndex((step) => step.state === "current"), 0)
  const shown = steps[current]

  return (
    <>
      <div className="bg-shell-surface border-shell-border flex flex-col gap-2 rounded-xl border p-4 sm:hidden">
        <p className="text-sm font-semibold">{shown?.label}</p>
        <Progress step={current + 1} total={steps.length} messages={messages} />
      </div>

      <aside className="hidden w-60 shrink-0 flex-col justify-between gap-8 sm:flex">
        <nav aria-label={text.stepsLabel}>
          <ol className="flex flex-col">
            {steps.map((step, index) => {
              const last = index === steps.length - 1
              const body = (
                <>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "relative z-10 grid size-7 shrink-0 place-items-center rounded-full border-2 text-xs font-semibold",
                      step.state === "pending" ? "border-shell-border bg-shell-surface text-muted-foreground" : "border-brand-yellow bg-brand-yellow text-brand-ink",
                      step.state === "current" && "ring-brand-yellow/30 ring-4",
                    )}
                  >
                    {step.state === "done" ? <CheckIcon className="size-4" /> : index + 1}
                  </span>
                  <span className="flex flex-col pt-0.5 text-left">
                    <span className={cn("text-sm", step.state === "pending" ? "text-muted-foreground font-medium" : "font-semibold")}>{step.label}</span>
                    <span className="text-muted-foreground text-xs">{step.hint}</span>
                  </span>
                </>
              )
              return (
                <li key={step.label} className="relative flex pb-6 last:pb-0">
                  {last ? null : <span aria-hidden="true" className={cn("absolute top-7 left-3.5 h-full w-0.5 -translate-x-1/2", step.state === "done" ? "bg-brand-yellow" : "bg-shell-border")} />}
                  {step.state === "done" ? (
                    <button type="button" onClick={() => onStep(index)} className="focus-visible:ring-ring flex gap-3 rounded-md focus-visible:ring-2 focus-visible:outline-none">
                      {body}
                    </button>
                  ) : (
                    <div className="flex gap-3" aria-current={step.state === "current" ? "step" : undefined}>
                      {body}
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        </nav>
        <div className="bg-shell-surface border-shell-border rounded-xl border p-4">
          <Progress step={current + 1} total={steps.length} messages={messages} />
        </div>
      </aside>
    </>
  )
}
