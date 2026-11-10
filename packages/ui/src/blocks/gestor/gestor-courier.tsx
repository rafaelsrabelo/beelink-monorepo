// React
import { useId } from "react"

// Libs
import { BikeIcon } from "lucide-react"

// UI
import { buttonVariants } from "@harness-monorepo/ui/components/button"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface GestorCourierProps {
  /** WhatsApp with the delivery written for the courier; null when the order has no address to send. */
  whatsappHref: string | null
  messages?: UiMessages
}

/**
 * "Chamar entregador", inside the order it is for. The shop's own courier goes by WhatsApp: the
 * message carries where, what and what to collect, and the shopkeeper picks who in their contacts.
 * Delivery apps join here, beside it — the order is where a delivery belongs.
 */
export function GestorCourier({ whatsappHref, messages = defaultMessages }: GestorCourierProps) {
  const text = messages.gestor.courier
  const id = useId()

  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h3 id={id} className="text-foreground text-base font-bold">
        {text.title}
      </h3>
      <div className="border-shell-border flex flex-col gap-3 rounded-xl border p-3.5">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="bg-header text-header-foreground flex size-10 shrink-0 items-center justify-center rounded-full">
            <BikeIcon className="size-5" />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-foreground font-semibold">{text.own}</p>
            <p className="text-shell-muted text-sm">{whatsappHref ? text.ownHint : text.noAddress}</p>
          </div>
        </div>
        {whatsappHref ? (
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={buttonVariants({ className: "h-11 w-full font-semibold" })}>
            {text.send}
          </a>
        ) : null}
      </div>
      <p className="text-shell-muted text-sm">{text.soon}</p>
    </section>
  )
}
