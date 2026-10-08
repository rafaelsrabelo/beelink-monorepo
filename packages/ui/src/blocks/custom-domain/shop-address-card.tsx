// UI
import type { ShopAddressDomain } from "@harness-monorepo/ui/lib/custom-domain"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { LinkComponent } from "../auth/auth-link"
import { SetupCard } from "../dashboard/setup-card"

export interface ShopAddressCardProps {
  /** The page's address at the platform, with no scheme: `beelink.biz/minha-loja`. */
  address: string
  /** The shop's own domain and where it stands; null while it has none. */
  domain: ShopAddressDomain | null
  /** The domain's own screen. */
  href: string
  /** How wide the card sits in the home's grid: the screen's to say, as of every card there. */
  className?: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The shop's address among the cards of the panel's home (BEELINK-285), drawn as every card there
 * is. With no domain it says the address the page has and calls for a domain of the shop's own; a
 * saved domain not yet active is waiting, which is neither left to do nor done; an active one is the
 * address, and the card is done.
 *
 * The domain shown is the host the API told. The card never builds an address to go to: "ver a
 * loja" beside it leads to the platform's, which leads on to the domain while it is active.
 */
export function ShopAddressCard({ address, domain, href, className, linkComponent, messages = defaultMessages }: ShopAddressCardProps) {
  const text = messages.customDomain.home
  const said = domain === null ? text.none : domain.status === "ACTIVE" ? text.active : text.pending

  return (
    <SetupCard
      title={said.title}
      description={format(said.text, { address, domain: domain?.host ?? "" })}
      actionLabel={said.action}
      href={href}
      done={domain?.status === "ACTIVE"}
      status={domain?.status === "PENDING" ? text.pending.badge : undefined}
      className={className}
      linkComponent={linkComponent}
      messages={messages}
    />
  )
}
