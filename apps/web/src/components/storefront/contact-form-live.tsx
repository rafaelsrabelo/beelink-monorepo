"use client"

// Types
import type { ContactField } from "@harness-monorepo/contracts"

// UI
import { StorefrontContact } from "@harness-monorepo/ui/blocks/storefront/storefront-contact"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { useSendLead } from "@/services/leads/lead-hooks"
import type { ContactCopy } from "./storefront-contact-copy"

export interface ContactFormLiveProps {
  slug: string
  componentId: string
  title: string | null
  subtitle: string | null
  fields: readonly ContactField[]
  whatsappHref: string | null
  /** The refusals a visitor can meet, already sentences — the page picks them from the dictionary. */
  copy: ContactCopy
  messages: UiMessages
}

/**
 * The contact block, sending for real. The shop window's only client-side write.
 *
 * The block draws; this owns the send, because a design-system block may not reach the network.
 * Design mode's preview never mounts this — it draws the block with no handler, which sends nothing.
 */
export function ContactFormLive({ slug, componentId, title, subtitle, fields, whatsappHref, copy, messages }: ContactFormLiveProps) {
  const send = useSendLead(slug)
  const code = send.error && "errorCode" in send.error ? String(send.error.errorCode) : null

  return (
    <StorefrontContact
      title={title}
      subtitle={subtitle}
      fields={fields}
      whatsappHref={whatsappHref}
      status={send.isSuccess ? "sent" : send.isPending ? "sending" : "idle"}
      error={code ? (copy[code as keyof ContactCopy] ?? copy.UNKNOWN) : null}
      onSubmit={(submission) => send.mutate({ componentId, ...submission })}
      messages={messages}
    />
  )
}
