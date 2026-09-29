// React
import type { ReactNode } from "react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { StorefrontOrderSteps, type StorefrontOrderStep } from "./storefront-order-steps"

export interface StorefrontOrderStatusProps {
  /** Where it stands, in the list card's words: "Em preparo", "Cancelado em 28 de set. de 2026". */
  headline: string
  /** When it last moved, or who cancelled it. */
  detail: string | null
  tone: "progress" | "done" | "cancelled"
  /** Null for a cancelled order: the headline says when, and the detail by whom. */
  steps: readonly StorefrontOrderStep[] | null
  /** How the delivery comes — the carrier, the code, the link — beside the headline, as 6e has it. */
  tracking?: ReactNode
  messages?: UiMessages
}

const TONE = { progress: "text-shop-positive-ink", done: "text-shop-positive-ink", cancelled: "text-shop-on-background" } as const

/** Where the order is (6e, 6f): the status in large type, when it moved, and the steps it has taken and has to go. */
export function StorefrontOrderStatus({ headline, detail, tone, steps, tracking, messages = defaultMessages }: StorefrontOrderStatusProps) {
  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-shop-line bg-shop-background p-5 text-shop-on-background shop-md:p-7">
      <div className="flex flex-col gap-4 shop-md:flex-row shop-md:items-start">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className={cn("text-2xl font-extrabold shop-md:text-3xl", TONE[tone])}>{headline}</h2>
          {detail ? <p className="text-sm text-shop-muted shop-md:text-[15px]">{detail}</p> : null}
        </div>
        {tracking ? <div className="shop-md:ml-auto">{tracking}</div> : null}
      </div>
      {steps ? <StorefrontOrderSteps steps={steps} messages={messages} /> : null}
    </section>
  )
}
