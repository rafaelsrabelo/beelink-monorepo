// Libs
import { PlusIcon } from "lucide-react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { LANDING_CONTAINER } from "./landing-styles"
import { LandingTitle } from "./landing-title"

export interface LandingFaqProps {
  messages?: UiMessages
}

/**
 * "Perguntas": the shopkeeper's, then the courier's, each marked by whose it is. Native
 * `<details>`: every answer is in the page for a crawler, and opens with no script.
 */
export function LandingFaq({ messages = defaultMessages }: LandingFaqProps) {
  const text = messages.landing.faq
  const questions = [
    ...text.shopkeeper.map((item) => ({ ...item, tag: text.shopkeeperTag, tone: "bg-brand-ink text-brand-yellow" })),
    ...text.courier.map((item) => ({ ...item, tag: text.courierTag, tone: "bg-brand-yellow text-brand-ink" })),
  ]

  return (
    <section id="perguntas" className={cn(LANDING_CONTAINER, "flex scroll-mt-6 flex-col gap-10 pt-20 pb-20 md:pt-[120px] md:pb-[100px] lg:flex-row lg:gap-20")}>
      <div className="flex flex-col gap-4 lg:w-[400px] lg:shrink-0">
        <LandingTitle light={text.titleLight} strong={text.titleStrong} className="text-4xl md:text-[56px]" />
        <p className="text-[17px] leading-[1.55] text-brand-text">{text.lead}</p>
      </div>
      <div className="flex flex-col lg:flex-1">
        {questions.map((item) => (
          <details key={item.question} className="group border-b-[1.5px] border-brand-line py-6">
            <summary className="flex cursor-pointer list-none items-center gap-4 text-lg font-bold md:text-xl [&::-webkit-details-marker]:hidden">
              <span className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <span className={cn("self-start rounded-full px-2.5 py-1 text-xs font-extrabold tracking-[0.12em] uppercase sm:self-auto", item.tone)}>{item.tag}</span>
                {item.question}
              </span>
              <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-yellow transition-transform group-open:rotate-45 motion-reduce:transition-none">
                <PlusIcon className="size-5" />
              </span>
            </summary>
            <p className="mt-3.5 leading-[1.65] text-brand-text md:mr-14">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
