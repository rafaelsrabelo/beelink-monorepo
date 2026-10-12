// React
import type { ReactNode } from "react"

// Libs
import { MessagesSquareIcon } from "lucide-react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { LandingIntegrationValue, UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { LANDING_CONTAINER } from "./landing-styles"
import { LandingTitle } from "./landing-title"

export interface LandingIntegrationsProps {
  /**
   * Each third party's own mark, as the app's own image: it fills the square it is given and is read
   * out with `landing.integrations.items.<key>.alt`. The files are the ones the panel's
   * Integrations page draws, as they came — never recoloured, never redrawn.
   */
  logos: Record<LandingIntegrationValue, ReactNode>
  messages?: UiMessages
}

const INTEGRATIONS: readonly LandingIntegrationValue[] = ["asaas", "melhorEnvio", "googleAnalytics", "meta"]

/**
 * A card asks for a share of its row and grows into what the row has left: one to a row on a phone,
 * two from `sm`, three from `lg`, and a short last row closes the width instead of leaving a hole.
 * From `xl` the five share one row.
 */
const CARD = "flex min-w-0 grow basis-full flex-col gap-4 rounded-[28px] bg-brand-surface p-6 shadow-sm sm:basis-[40%] lg:basis-[30%] xl:basis-0"
const MARK = "flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl"
const NAME = "text-xl font-extrabold tracking-[-0.02em]"
const TEXT = "text-[15px] leading-[1.55] text-brand-text"

/**
 * "Integrações" (BEELINK-317): the third parties a shop connects, each by its mark, its name and
 * what it does in the shop today — and Beelia, Beelink's own WhatsApp product, announced as still to
 * come. A list of facts: no card is a link or a button, and none answers the pointer, since there
 * is nowhere for one to lead. Beelia has no artwork yet, so a conversation icon on the brand's
 * yellow stands where a mark would, saying nothing to a reader — its name is written beside it.
 */
export function LandingIntegrations({ logos, messages = defaultMessages }: LandingIntegrationsProps) {
  const text = messages.landing.integrations

  return (
    <section id="integracoes" className={cn(LANDING_CONTAINER, "flex scroll-mt-6 flex-col gap-10 py-10 md:gap-12 md:py-20")}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:gap-10">
        <LandingTitle light={text.titleLight} strong={text.titleStrong} className="text-4xl md:text-[56px]" />
        <p className="max-w-[420px] text-lg leading-[1.55] text-brand-text lg:mb-2 lg:ml-auto">{text.lead}</p>
      </div>
      <ul className="flex flex-wrap gap-4 xl:flex-nowrap">
        {INTEGRATIONS.map((integration) => (
          <li key={integration} className={CARD}>
            {/* The line keeps a mark on a white ground from vanishing into the white card. */}
            <span className={cn(MARK, "border border-brand-line")}>{logos[integration]}</span>
            <h3 className={NAME}>{text.items[integration].name}</h3>
            <p className={TEXT}>{text.items[integration].text}</p>
          </li>
        ))}
        <li className={CARD}>
          <span aria-hidden="true" className={cn(MARK, "bg-brand-yellow")}>
            <MessagesSquareIcon className="size-[26px]" />
          </span>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <h3 className={NAME}>{text.beelia.name}</h3>
            <span className="rounded-full bg-brand-ink px-2.5 py-1 text-xs font-extrabold tracking-[0.12em] whitespace-nowrap text-brand-yellow uppercase">{text.soon}</span>
          </div>
          <p className={TEXT}>{text.beelia.text}</p>
        </li>
      </ul>
    </section>
  )
}
