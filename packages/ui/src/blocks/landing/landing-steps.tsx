// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { LANDING_CONTAINER, LANDING_LIFT } from "./landing-styles"
import { LandingTitle } from "./landing-title"

export interface LandingStepsProps {
  messages?: UiMessages
}

/**
 * "Como funciona": three steps from signing up to the first sale. An ordered list, which is what
 * says the order to a reader — the large numbers are drawn only.
 *
 * The design draws them in the brand's yellow, which on a white card reads at 1.6:1. They are in
 * ink here, closed by the yellow full stop the headings carry: the same mark, and a number a
 * person with low vision can still see.
 */
export function LandingSteps({ messages = defaultMessages }: LandingStepsProps) {
  const text = messages.landing.steps

  return (
    <section id="como" className={cn(LANDING_CONTAINER, "flex scroll-mt-6 flex-col gap-12 pt-10 pb-20 md:pt-20 md:pb-[110px]")}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:gap-10">
        <LandingTitle light={text.titleLight} strong={text.titleStrong} className="text-4xl md:text-[56px]" />
        <p className="max-w-[420px] text-lg leading-[1.55] text-brand-text lg:mb-2 lg:ml-auto">{text.lead}</p>
      </div>
      <ol className="grid gap-5 md:grid-cols-3">
        {text.items.map((step, at) => (
          <li key={step.title} className={cn(LANDING_LIFT, "flex flex-col gap-4 rounded-[28px] bg-brand-surface p-8 shadow-sm")}>
            <span aria-hidden="true" className="text-[64px] leading-none font-extrabold tracking-[-0.04em]">
              {String(at + 1).padStart(2, "0")}
              <span className="text-brand-yellow">.</span>
            </span>
            <h3 className="text-[26px] font-extrabold tracking-[-0.02em]">{step.title}</h3>
            <p className="leading-[1.6] text-brand-text">{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
