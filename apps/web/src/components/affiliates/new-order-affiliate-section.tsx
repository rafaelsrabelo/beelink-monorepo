"use client"

// UI
import { OrderAffiliateField } from "@harness-monorepo/ui/blocks/affiliates/order-affiliate-field"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { useAffiliateProgram } from "@/services/affiliates/affiliate-hooks"
import { useShopAffiliates } from "@/services/affiliates/shop-affiliate-hooks"

export interface NewOrderAffiliateSectionProps {
  slug: string
  /** `""` is nobody. */
  value: string
  onChange: (affiliateId: string) => void
  disabled?: boolean
  messages: UiMessages
}

/** The most a page of affiliates holds: the picker offers every active one. */
const PICKER_PAGE_SIZE = 100

/**
 * The affiliate a sale registered in the panel came by (IMPULSEIA-107), offered only where an order
 * can be credited to one — the programme on, crediting live, someone active. Nothing otherwise: the
 * form is the same as before.
 */
export function NewOrderAffiliateSection({ slug, value, onChange, disabled = false, messages }: NewOrderAffiliateSectionProps) {
  const program = useAffiliateProgram(slug)
  const people = useShopAffiliates(slug, { status: "ACTIVE", page: 1, pageSize: PICKER_PAGE_SIZE })
  const options = (people.data?.affiliates ?? []).map((person) => ({ id: person.id, name: person.name }))

  if (!program.data?.program.enabled || !program.data.linksLive || options.length === 0) return null
  return <OrderAffiliateField options={options} value={value} onChange={onChange} disabled={disabled} messages={messages} />
}
