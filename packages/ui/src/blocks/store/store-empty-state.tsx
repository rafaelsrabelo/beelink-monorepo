// Libs
import { StoreIcon } from "lucide-react"

// UI
import { buttonVariants } from "@harness-monorepo/ui/components/button"
import {
  Card,
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

export interface StoreEmptyStateProps {
  /** Where the create-shop flow starts. The screen owns the route. */
  createHref: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** What a shopkeeper with no shop sees: one sentence about what a shop is for, and one way in. */
export function StoreEmptyState({
  createHref,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StoreEmptyStateProps) {
  const text = messages.store.empty

  return (
    <Card className="w-full">
      <CardHeader className="items-center text-center">
        <span
          aria-hidden="true"
          className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground"
        >
          <StoreIcon className="size-6" />
        </span>
        <CardTitle>{text.title}</CardTitle>
        <CardDescription>{text.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <Link href={createHref} className={buttonVariants()}>
          {text.action}
        </Link>
      </CardContent>
    </Card>
  )
}
