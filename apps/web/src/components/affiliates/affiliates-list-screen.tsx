"use client"

// React
import { useState, type ReactNode } from "react"

// Next
import { useRouter, useSearchParams } from "next/navigation"

// UI
import { AffiliateInviteDialog } from "@harness-monorepo/ui/blocks/affiliates/affiliate-invite-dialog"
import { AffiliateListSection } from "@harness-monorepo/ui/blocks/affiliates/affiliate-list-section"
import { AffiliateRows } from "@harness-monorepo/ui/blocks/affiliates/affiliate-rows"
import { AffiliateStatusTabs } from "@harness-monorepo/ui/blocks/affiliates/affiliate-status-tabs"
import { AffiliatesFailed } from "@harness-monorepo/ui/blocks/affiliates/affiliates-failed"
import { AffiliatesSkeleton } from "@harness-monorepo/ui/blocks/affiliates/affiliates-skeleton"
import { TablePager } from "@harness-monorepo/ui/blocks/catalog/table-pager"
import { AFFILIATE_STATUS_VALUES, type AffiliateInviteFormValues, type AffiliateInviteIssues, type AffiliateStatusValue } from "@harness-monorepo/ui/lib/affiliates"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import { affiliateErrorOf } from "@/lib/affiliate-form"
import { affiliateDateFormatter, affiliateListItemOf, affiliateTableOptionsOf, emptyInviteOf, invitePayloadOf } from "@/lib/affiliate-people"
import { useAffiliateProgram } from "@/services/affiliates/affiliate-hooks"
import { AffiliateError } from "@/services/affiliates/affiliate-requests"
import { useInviteAffiliate, useShopAffiliates } from "@/services/affiliates/shop-affiliate-hooks"
import { AffiliatesFrame } from "./affiliates-frame"

export interface AffiliatesListScreenProps {
  slug: string
  locale: string
  messages: UiMessages
}

const codeOf = (error: Error | null): string => (error instanceof AffiliateError ? error.errorCode : "UNKNOWN")
const statusOf = (raw: string | null): AffiliateStatusValue | null => AFFILIATE_STATUS_VALUES.find((status) => status === raw) ?? null

/**
 * The shop's affiliates (IMPULSEIA-104): filtered by standing and paged in the address, so a reload or
 * the back button keeps the place; inviting in a dialog, on a table chosen from the programme's.
 */
export function AffiliatesListScreen({ slug, locale, messages }: AffiliatesListScreenProps) {
  const text = messages.affiliates
  const router = useRouter()
  const params = useSearchParams()
  const status = statusOf(params.get("status"))
  const page = Math.max(Number(params.get("page") ?? 1) || 1, 1)
  const list = useShopAffiliates(slug, { status, page })
  const program = useAffiliateProgram(slug)
  const invite = useInviteAffiliate(slug)
  const [inviting, setInviting] = useState(false)
  const [value, setValue] = useState<AffiliateInviteFormValues>(emptyInviteOf(""))
  const [issues, setIssues] = useState<AffiliateInviteIssues>({})
  const [notice, setNotice] = useState("")

  function go(nextStatus: AffiliateStatusValue | null, nextPage: number) {
    const query = new URLSearchParams()
    if (nextStatus) query.set("status", nextStatus)
    if (nextPage > 1) query.set("page", String(nextPage))
    const suffix = query.toString()
    router.replace(`/admin/${slug}/affiliates${suffix ? `?${suffix}` : ""}` as Parameters<typeof router.replace>[0])
  }

  const frame = (children: ReactNode) => <AffiliatesFrame slug={slug} active="affiliates" messages={messages}>{children}</AffiliatesFrame>
  if (list.isPending || program.isPending) return frame(<AffiliatesSkeleton shape="list" />)
  if (list.isError || program.isError) return frame(<AffiliatesFailed onRetry={() => void Promise.all([list.refetch(), program.refetch()])} messages={messages} />)

  const date = affiliateDateFormatter(locale)
  const tables = affiliateTableOptionsOf(program.data.tables, locale)
  const defaultTableId = program.data.tables.find((table) => table.isDefault)?.id ?? ""

  function open() {
    invite.reset()
    setIssues({})
    setNotice("")
    setValue(emptyInviteOf(defaultTableId))
    setInviting(true)
  }

  function submit() {
    const result = invitePayloadOf(value, text.affiliateIssues)
    if ("issues" in result) return setIssues(result.issues)
    invite.mutate(result.payload, {
      onSuccess: () => {
        setInviting(false)
        setNotice(format(text.inviteDialog.sent, { email: result.payload.email }))
      },
    })
  }

  return frame(
    <>
      <AffiliateListSection onInvite={open} messages={messages}>
        <AffiliateStatusTabs value={status} onValueChange={(next) => go(next, 1)} messages={messages}>
          <AffiliateRows
            affiliates={list.data.affiliates.map((affiliate) => affiliateListItemOf(affiliate, text.list, date))}
            hrefOf={(affiliateId) => `/admin/${slug}/affiliates/${affiliateId}`}
            filtered={status !== null}
            linkComponent={AppLink}
            messages={messages}
          />
          <TablePager
            page={list.data.page}
            pageSize={list.data.pageSize}
            total={list.data.total}
            busy={list.isFetching}
            onPageChange={(next) => go(status, next)}
            previousLabel={text.list.previous}
            nextLabel={text.list.next}
            rangeLabel={(from, to, total) => format(text.list.range, { from: String(from), to: String(to), total: String(total) })}
          />
        </AffiliateStatusTabs>
      </AffiliateListSection>
      <p role="status" className="text-muted-foreground text-sm">
        {notice}
      </p>

      <AffiliateInviteDialog
        open={inviting}
        onOpenChange={(next) => {
          if (!next) setInviting(false)
        }}
        value={value}
        onChange={(next) => {
          setIssues({})
          setValue(next)
        }}
        onSubmit={submit}
        tables={tables}
        issues={issues}
        pending={invite.isPending}
        error={invite.error ? affiliateErrorOf(codeOf(invite.error), text.errors) : undefined}
        messages={messages}
      />
    </>,
  )
}
