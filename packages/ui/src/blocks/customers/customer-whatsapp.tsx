// React
import { useId } from "react"

// UI
import { Button, buttonVariants } from "@harness-monorepo/ui/components/button"

// Locales
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { WhatsAppIcon } from "../store/store-brand-icons"

export interface CustomerWhatsAppProps {
  /** Who the conversation is with: the button's accessible name says it, row after row. */
  name: string
  /** The conversation already typed; null when there is no phone to open it on. */
  href: string | null
  /** What the button says: in full on a card, short in the table's narrow column. */
  label: string
  messages: UiMessages
}

/**
 * "Chamar no WhatsApp", opening the conversation in a new tab. With no phone the button stays, off,
 * with the reason written under it and given as its description — not a tooltip: a disabled button
 * takes neither focus nor hover, so a tooltip on it would never open.
 */
export function CustomerWhatsApp({ name, href, label, messages }: CustomerWhatsAppProps) {
  const text = messages.customers
  const reasonId = useId()
  const accessibleName = format(text.whatsappLabel, { name })
  const icon = <WhatsAppIcon className="size-3.5" />

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" aria-label={accessibleName} className={buttonVariants({ variant: "outline", size: "sm" })}>
        {icon}
        {label}
      </a>
    )
  }

  return (
    <span className="flex flex-col items-start gap-1">
      <Button type="button" variant="outline" size="sm" disabled aria-label={accessibleName} aria-describedby={reasonId}>
        {icon}
        {label}
      </Button>
      <span id={reasonId} className="text-muted-foreground text-xs">
        {text.whatsappNoPhone}
      </span>
    </span>
  )
}
