// Icons
import { CheckIcon } from "lucide-react"

// UI
import { Button, buttonVariants } from "@harness-monorepo/ui/components/button"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface AffiliateInviteSentProps {
  email: string
  /** The new affiliate's record. */
  recordHref: string
  onAnother: () => void
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** After the invite went out (the user's design, 12/11/2026): where it went, and the two ways on. */
export function AffiliateInviteSent({ email, recordHref, onAnother, linkComponent: Link = AnchorLink, messages = defaultMessages }: AffiliateInviteSentProps) {
  const text = messages.affiliates.wizard.sent
  return (
    <section aria-labelledby="affiliate-invite-sent" className="bg-shell-surface border-shell-border mx-auto flex w-full max-w-lg flex-col items-center gap-4 rounded-2xl border p-8 text-center shadow-xs">
      <span aria-hidden="true" className="bg-brand-yellow text-brand-ink grid size-14 place-items-center rounded-full">
        <CheckIcon className="size-7" />
      </span>
      <h1 id="affiliate-invite-sent" className="text-xl font-semibold">
        {text.title}
      </h1>
      <p className="text-muted-foreground text-sm" role="status">
        {format(text.description, { email })}
      </p>
      <div className="flex w-full flex-col gap-2 sm:flex-row">
        <Link href={recordHref} className={buttonVariants({ variant: "outline", size: "lg", className: "flex-1" })}>
          {text.view}
        </Link>
        <Button type="button" size="lg" className="flex-1" onClick={onAnother}>
          {text.another}
        </Button>
      </div>
    </section>
  )
}
