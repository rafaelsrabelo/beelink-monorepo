"use client"

// React
import { useId, type ReactNode, type Ref } from "react"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

/** Open: being filled in. Done: what was chosen, in a line, with the way back into it. Locked: what comes first. */
export type CheckoutStepState = "open" | "done" | "locked"

export interface StorefrontCheckoutStepProps {
  step: number
  total: number
  title: string
  state: CheckoutStepState
  /** Done: what was chosen, in a line or two. */
  summary?: ReactNode
  /** Done: the way back into it — a link or a button, drawn by the caller. */
  edit?: ReactNode
  /** Locked: what to do first, in words. */
  hint?: string
  /** The step's heading, for the focus to land on when the step opens by a press. */
  headingRef?: Ref<HTMLHeadingElement>
  children?: ReactNode
  messages?: UiMessages
}

/**
 * One step of the checkout, as the Yampi and the Ceyó draw theirs: a number, a title and "1 de 3".
 * Open, it holds its fields; done, it is a line saying what was chosen, with "Alterar"; locked, it
 * says what comes first and holds nothing — on a phone, one step at a time is all there is to read.
 */
export function StorefrontCheckoutStep({ step, total, title, state, summary, edit, hint, headingRef, children, messages = defaultMessages }: StorefrontCheckoutStepProps) {
  const text = messages.storefront
  const id = useId()
  const frame =
    state === "open" ? "border-shop-line-strong bg-shop-background" : state === "done" ? "border-shop-line bg-shop-fill" : "border-shop-line bg-shop-background opacity-60"

  return (
    <section aria-labelledby={`${id}-title`} className={`flex flex-col gap-3 rounded-[10px] border p-4 ${frame}`}>
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className={`flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${state === "locked" ? "bg-shop-line text-shop-muted" : "bg-shop-primary text-shop-on-primary"}`}
        >
          {state === "done" ? "✓" : step}
        </span>
        <h2 id={`${id}-title`} ref={headingRef} tabIndex={-1} className="grow text-base font-bold outline-none">
          {title}
          {state === "done" ? <span className="sr-only"> — {text.checkoutStepDone}</span> : null}
        </h2>
        <span className="shrink-0 text-xs text-shop-muted">{format(text.checkoutStepOf, { step: String(step), total: String(total) })}</span>
      </div>
      {state === "done" ? (
        <div className="flex items-start justify-between gap-3 text-sm">
          <div className="min-w-0 break-words">{summary}</div>
          {edit ? <div className="shrink-0">{edit}</div> : null}
        </div>
      ) : state === "locked" ? (
        hint ? <p className="text-sm text-shop-muted">{hint}</p> : null
      ) : (
        children
      )}
    </section>
  )
}
