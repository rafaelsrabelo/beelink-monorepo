// React
import type { ReactNode } from "react"

// Types
import type { ContactField, PublicComponent } from "@harness-monorepo/contracts"

// UI
import { StorefrontContact } from "@harness-monorepo/ui/blocks/storefront/storefront-contact"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { ContactFormLive } from "./contact-form-live"
import type { ContactCopy } from "./storefront-contact-copy"

/**
 * What a contact form needs to send: the site, its WhatsApp and the sentences for a refusal. Null
 * in design mode's preview, where the form draws and sends nothing.
 */
export interface LiveContact {
  slug: string
  whatsappHref: string | null
  copy: ContactCopy
}

export interface StorefrontContactBlockProps {
  component: PublicComponent
  /** Null in the preview: see `LiveContact`. */
  contact: LiveContact | null
  messages: UiMessages
}

/** A site's contact form: live in the shop window, drawn and sending nothing in design mode. */
export function StorefrontContactBlock({ component, contact, messages }: StorefrontContactBlockProps): ReactNode {
  const fields = component.items as ContactField[]

  return contact ? (
    <ContactFormLive
      slug={contact.slug}
      componentId={component.id}
      title={component.title}
      subtitle={component.subtitle}
      fields={fields}
      whatsappHref={contact.whatsappHref}
      copy={contact.copy}
      messages={messages}
    />
  ) : (
    <StorefrontContact title={component.title} subtitle={component.subtitle} fields={fields} messages={messages} />
  )
}
