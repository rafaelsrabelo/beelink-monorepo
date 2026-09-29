// Libs
import { CheckIcon } from "lucide-react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export type StorefrontOrderStepState = "done" | "current" | "todo"

export interface StorefrontOrderStep {
  label: string
  /** When it happened, already in words; null for a step to come, or one the shop went past without. */
  when: string | null
  state: StorefrontOrderStepState
}

export interface StorefrontOrderStepsProps {
  steps: readonly StorefrontOrderStep[]
  messages?: UiMessages
}

const MARK: Record<StorefrontOrderStepState, string> = {
  done: "bg-shop-positive text-shop-on-positive",
  current: "border-4 border-shop-positive bg-shop-background",
  todo: "border-2 border-shop-line-strong bg-shop-background",
}

/**
 * Where an order is on its way (6c, 6f): a column on a phone, a row from `shop-md`. A step done is
 * a filled mark, the one it is at a ring, and the rest wait in grey; the line after a step done is
 * filled too, so the way travelled reads at a glance.
 */
export function StorefrontOrderSteps({ steps, messages = defaultMessages }: StorefrontOrderStepsProps) {
  const text = messages.storefront

  return (
    <ol aria-label={text.orderSteps} className="flex flex-col shop-md:grid shop-md:auto-cols-fr shop-md:grid-flow-col">
      {steps.map((step, index) => (
        <li key={step.label} aria-current={step.state === "current" ? "step" : undefined} className="group flex gap-3 shop-md:flex-col shop-md:gap-2">
          <span aria-hidden="true" className="flex flex-col items-center shop-md:flex-row">
            <span className={cn("flex size-[22px] shrink-0 items-center justify-center rounded-full", MARK[step.state])}>
              {step.state === "done" ? <CheckIcon className="size-3.5" strokeWidth={3} /> : null}
            </span>
            {index < steps.length - 1 ? (
              <span className={cn("w-[3px] grow shop-md:h-1 shop-md:w-auto", step.state === "done" ? "bg-shop-positive" : "bg-shop-line")} />
            ) : null}
          </span>
          <span className="flex min-w-0 flex-col gap-0.5 pb-4 group-last:pb-0 shop-md:pr-3 shop-md:pb-0">
            <span className={cn("text-sm font-bold", step.state === "current" && "text-shop-positive-ink", step.state === "todo" && "font-semibold text-shop-muted")}>
              {step.label}
              {step.state === "current" ? null : <span className="sr-only">{`, ${step.state === "done" ? text.orderStepDone : text.orderStepTodo}`}</span>}
            </span>
            {step.when ? <span className="text-xs text-shop-muted">{step.when}</span> : null}
          </span>
        </li>
      ))}
    </ol>
  )
}
