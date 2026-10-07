// React
import { useId } from "react"

// Libs
import { ArrowRightIcon } from "lucide-react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink } from "../auth/auth-link"
import type { LinkComponent } from "../auth/auth-link"

export interface MetaPixelReportLinkProps {
  /** The report's page in the panel. The address is the screen's to know. */
  href: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The way from the pixel's page to the sales by origin (BEELINK-275): where a shopkeeper who runs
 * ads looks for what they brought. Shown with or without an ID saved — a campaign's labels are kept
 * on an order whether the shop has a pixel or not.
 */
export function MetaPixelReportLink({ href, linkComponent: Link = AnchorLink, messages = defaultMessages }: MetaPixelReportLinkProps) {
  const text = messages.integrations.metaPixel.salesByOrigin
  const id = useId()

  return (
    <section aria-labelledby={`${id}-title`} className="bg-shell-surface border-shell-border flex flex-col gap-2 rounded-xl border p-4 shadow-xs sm:p-6">
      <h2 id={`${id}-title`} className="font-semibold">
        {text.title}
      </h2>
      <p className="text-muted-foreground text-sm">{text.text}</p>
      <Link href={href} className="text-foreground inline-flex w-fit items-center gap-1 text-sm underline underline-offset-4">
        {text.link}
        <ArrowRightIcon aria-hidden="true" className="size-3.5" />
      </Link>
    </section>
  )
}
