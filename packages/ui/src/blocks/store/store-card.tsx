// UI
import { Avatar, AvatarFallback, AvatarImage } from "@harness-monorepo/ui/components/avatar"
import { Badge } from "@harness-monorepo/ui/components/badge"
import { buttonVariants } from "@harness-monorepo/ui/components/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@harness-monorepo/ui/components/card"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { initialsOf } from "../dashboard/dashboard-types"
import type { StoreSummary } from "./store-types"

export interface StoreCardProps {
  store: StoreSummary
  /** Where the panel for this shop lives. The screen builds it; a block never knows a route. */
  panelHref: string
  /** The public shop window. Omitted, the card offers no link to it. */
  storefrontHref?: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** One shop in the shopkeeper's list: who it is, what it sells, and the way into its panel. */
export function StoreCard({
  store,
  panelHref,
  storefrontHref,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StoreCardProps) {
  const text = messages.store

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Avatar size="lg">
            {store.logoUrl ? <AvatarImage src={store.logoUrl} alt={text.card.logoAlt} /> : null}
            <AvatarFallback>{initialsOf(store.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <CardTitle className="truncate">{store.name}</CardTitle>
            <CardDescription className="truncate">/{store.slug}</CardDescription>
          </div>
        </div>
        <CardAction>
          {/* One word today, because STORE_TYPES holds one value. It reads from the field rather
              than from a constant so a second selling mode needs no change here. */}
          <Badge variant="outline">{text.typeLabels[store.type]}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {/* The Button primitive rendered as an anchor announces itself as a button; these navigate,
            so they are links wearing the button's classes. The shop's name joins the label because
            every card offers the same word, and a link heard out of context has to say which shop. */}
        <Link
          href={panelHref}
          aria-label={`${text.card.manage} ${store.name}`}
          className={buttonVariants()}
        >
          {text.card.manage}
        </Link>
        {storefrontHref ? (
          <Link
            href={storefrontHref}
            aria-label={`${text.card.viewStorefront} ${store.name}`}
            className={buttonVariants({ variant: "outline" })}
          >
            {text.card.viewStorefront}
          </Link>
        ) : null}
      </CardContent>
    </Card>
  )
}
