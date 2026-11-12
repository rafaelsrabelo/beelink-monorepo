"use client"

// React
import { useState } from "react"

// UI
import { OrderAffiliateCard } from "@harness-monorepo/ui/blocks/affiliates/order-affiliate-card"
import { OrderAffiliateDialog } from "@harness-monorepo/ui/blocks/affiliates/order-affiliate-dialog"
import { formatCents } from "@harness-monorepo/ui/blocks/storefront/storefront-price"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import type { OrderAffiliateFormValues, OrderAffiliateIssues } from "@harness-monorepo/ui/lib/affiliate-money"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import { affiliateErrorOf, payoutDayFormatter } from "@/lib/affiliate-form"
import { orderAffiliatePayloadOf } from "@/lib/affiliate-money-form"
import { orderAffiliateViewOf } from "@/lib/affiliate-money-view"
import { affiliateDateFormatter } from "@/lib/affiliate-people"
import { useAffiliateProgram } from "@/services/affiliates/affiliate-hooks"
import { useChangeOrderAffiliate, useOrderAffiliate } from "@/services/affiliates/affiliate-money-hooks"
import { AffiliateError } from "@/services/affiliates/affiliate-requests"
import { useShopAffiliates } from "@/services/affiliates/shop-affiliate-hooks"

export interface OrderAffiliateSectionProps {
  slug: string
  number: number
  locale: string
  messages: UiMessages
}

/** The most a page of affiliates holds: the picker offers every active one. */
const PICKER_PAGE_SIZE = 100

const codeOf = (error: Error | null): string => (error instanceof AffiliateError ? error.errorCode : "UNKNOWN")

/**
 * Whom an order is credited to (IMPULSEIA-107), in the order's side column, and the dialog that moves
 * it. Silent outside a programme: an order credited to nobody, in a shop that credits nobody, has
 * nothing to say. Crediting someone needs the programme on and crediting live; taking it off does not.
 */
export function OrderAffiliateSection({ slug, number, locale, messages }: OrderAffiliateSectionProps) {
  const text = messages.affiliates
  const read = useOrderAffiliate(slug, number)
  const program = useAffiliateProgram(slug)
  const people = useShopAffiliates(slug, { status: "ACTIVE", page: 1, pageSize: PICKER_PAGE_SIZE })
  const change = useChangeOrderAffiliate(slug, number)
  // Null while the dialog is closed: what it edits lives and dies with it.
  const [draft, setDraft] = useState<{ value: OrderAffiliateFormValues; issues: OrderAffiliateIssues } | null>(null)

  if (read.isPending || program.isPending) return <Skeleton className="h-36 w-full rounded-xl" />
  // The order's page stands without it: a read that failed leaves the column as it was.
  if (read.isError || program.isError) return null

  const current = read.data
  const crediting = program.data.program.enabled && program.data.linksLive
  if (!crediting && !current.affiliate && current.changes.length === 0) return null

  const view = orderAffiliateViewOf(current, {
    text,
    money: (cents) => formatCents(cents, locale, "BRL"),
    day: payoutDayFormatter(locale),
    date: affiliateDateFormatter(locale),
    hrefOf: (id) => `/admin/${slug}/affiliates/${id}`,
  })
  const options = crediting ? (people.data?.affiliates ?? []).map((person) => ({ id: person.id, name: person.name })) : []

  function submit() {
    if (!draft) return
    const outcome = orderAffiliatePayloadOf(draft.value, text.moneyIssues)
    if ("issues" in outcome) return setDraft({ ...draft, issues: outcome.issues })
    change.mutate(outcome.payload, { onSuccess: () => setDraft(null) })
  }

  return (
    <>
      <OrderAffiliateCard
        view={{ ...view, action: crediting || current.affiliate ? view.action : null }}
        onChange={() => {
          change.reset()
          setDraft({ value: { affiliateId: current.affiliate?.id ?? "", reason: "" }, issues: {} })
        }}
        linkComponent={AppLink}
        messages={messages}
      />
      <OrderAffiliateDialog
        open={draft !== null}
        onOpenChange={(open) => (open ? undefined : setDraft(null))}
        value={draft?.value ?? { affiliateId: "", reason: "" }}
        onChange={(value) => setDraft({ value, issues: {} })}
        onSubmit={submit}
        options={options}
        issues={draft?.issues}
        pending={change.isPending}
        error={change.error ? affiliateErrorOf(codeOf(change.error), text.errors) : undefined}
        messages={messages}
      />
    </>
  )
}
