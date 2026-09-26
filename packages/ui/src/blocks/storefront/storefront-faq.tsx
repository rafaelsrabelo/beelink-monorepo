// Libs
import { ChevronDownIcon } from "lucide-react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Block
import { StorefrontHeading } from "./storefront-heading"

/** One question and its answer. The contract's `FaqItem`, restated. */
export interface StorefrontFaqItem {
  id: string
  question: string
  answer: string
}

export interface StorefrontFaqProps {
  /** The block's id: it names the group, so opening a question closes the others of this FAQ only. */
  id: string
  title?: string | null
  subtitle?: string | null
  items: readonly StorefrontFaqItem[]
  className?: string
}

/**
 * Questions and their answers, each opening under its question.
 *
 * Native `<details>` and not the design system's accordion, on purpose. That one unmounts a closed
 * panel and cannot open anything before hydration; this page is anonymous and indexed, and an answer
 * belongs in its HTML whether or not anyone opened it. A `<summary>` is a button with its expanded
 * state, keyboard included, with no script at all. A shared `name` makes one question open at a
 * time where the browser supports it; an older one lets several stay open, which costs nothing.
 *
 * The questions are the summary's text and not headings: a heading inside a button is not one. The
 * block's title is the `h2`.
 */
export function StorefrontFaq({ id, title, subtitle, items, className }: StorefrontFaqProps) {
  if (!items.length) return null

  return (
    <div className={cn("mx-auto flex w-full max-w-3xl flex-col gap-6", className)}>
      <StorefrontHeading title={title} subtitle={subtitle} />
      <div className="flex flex-col divide-y divide-current/15 border-y border-current/15">
        {items.map((item) => (
          <details key={item.id} name={`faq-${id}`} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-base font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shop-primary-ink [&::-webkit-details-marker]:hidden">
              <span>{item.question}</span>
              <ChevronDownIcon
                aria-hidden="true"
                className="size-5 shrink-0 opacity-70 transition-transform group-open:rotate-180 motion-reduce:transition-none"
              />
            </summary>
            {/* `whitespace-pre-line`: the owner's line breaks are the only formatting an answer has. */}
            <p className="pb-4 text-sm whitespace-pre-line opacity-80 shop-sm:text-base">{item.answer}</p>
          </details>
        ))}
      </div>
    </div>
  )
}
