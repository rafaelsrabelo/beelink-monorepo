// Libs
import { TriangleAlertIcon } from "lucide-react"

// UI
import { Badge } from "@harness-monorepo/ui/components/badge"
import { buttonVariants } from "@harness-monorepo/ui/components/button"
import type { DeliveryCarriersView } from "@harness-monorepo/ui/lib/delivery"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface DeliveryCarriersProps {
  view: DeliveryCarriersView
  /** The web's route that sends the browser to Melhor Envio. */
  connectHref: string
  /** Where the services and the default parcel are chosen: the panel's Integrations. */
  manageHref: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * Where the shop's Melhor Envio account stands, inside the carriers card (BEELINK-177), and the way
 * to what is missing: connecting, connecting again, or choosing the services in Integrations.
 *
 * "Conectar" is a plain anchor, never the app's link: a router link prefetches its address, and this
 * one begins an authorization at Melhor Envio the moment it is fetched.
 */
export function DeliveryCarriers({ view, connectHref, manageHref, linkComponent: Link = AnchorLink, messages = defaultMessages }: DeliveryCarriersProps) {
  const text = messages.delivery.carriers

  if (!view.available) return <p className="text-muted-foreground text-sm">{text.unavailable}</p>

  if (view.status === "DISCONNECTED") {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-muted-foreground text-sm">{text.disconnected}</p>
        <a href={connectHref} className={buttonVariants({ variant: "outline" })}>
          {text.connect}
        </a>
      </div>
    )
  }

  if (view.status === "NEEDS_RECONNECT") {
    return (
      <div className="flex flex-col items-start gap-3">
        <p role="alert" className="text-destructive flex items-start gap-2 text-sm">
          <TriangleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {text.needsReconnect}
        </p>
        <a href={connectHref} className={buttonVariants({ variant: "outline" })}>
          {text.reconnect}
        </a>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <p className="flex flex-wrap items-center gap-2 text-sm">
        {format(text.connected, { name: view.accountName ?? "Melhor Envio" })}
        {view.sandbox ? <Badge variant="outline">{text.sandbox}</Badge> : null}
      </p>
      <Link href={manageHref} className={buttonVariants({ variant: "outline" })}>
        {text.manage}
      </Link>
    </div>
  )
}
