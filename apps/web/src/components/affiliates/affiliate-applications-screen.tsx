"use client"

// React
import { useState, type ReactNode } from "react"

// Next
import { useRouter, useSearchParams } from "next/navigation"

// UI
import { AffiliateApplicationApproveDialog } from "@harness-monorepo/ui/blocks/affiliates/affiliate-application-approve-dialog"
import { AffiliateApplicationsList } from "@harness-monorepo/ui/blocks/affiliates/affiliate-applications-list"
import { AffiliateConfirmDialog } from "@harness-monorepo/ui/blocks/affiliates/affiliate-confirm-dialog"
import { AffiliatesFailed } from "@harness-monorepo/ui/blocks/affiliates/affiliates-failed"
import { AffiliatesSkeleton } from "@harness-monorepo/ui/blocks/affiliates/affiliates-skeleton"
import { TablePager } from "@harness-monorepo/ui/blocks/catalog/table-pager"
import { AFFILIATE_APPLICATION_STATUS_VALUES, type AffiliateApplicationStatusValue, type AffiliateApplicationView } from "@harness-monorepo/ui/lib/affiliate-page"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import { applicationErrorOf, applicationReceivedFormatter, applicationViewOf } from "@/lib/affiliate-applications-view"
import { affiliateTableOptionsOf } from "@/lib/affiliate-people"
import { useAffiliateProgram } from "@/services/affiliates/affiliate-hooks"
import { useAffiliateApplications, useAffiliatePage, useDecideAffiliateApplication } from "@/services/affiliates/affiliate-page-hooks"
import { AffiliateError } from "@/services/affiliates/affiliate-requests"
import { AffiliatesFrame } from "./affiliates-frame"

export interface AffiliateApplicationsScreenProps {
  slug: string
  locale: string
  messages: UiMessages
}

const statusOf = (raw: string | null): AffiliateApplicationStatusValue => AFFILIATE_APPLICATION_STATUS_VALUES.find((status) => status === raw) ?? "PENDING"

/**
 * The applications the shop's "Seja afiliado" page took (plan 2026-11-14), filtered and paged in the
 * address. Approving asks first on which table — the one the page announces to begin with — and
 * refusing asks once more, since the person is not told.
 */
export function AffiliateApplicationsScreen({ slug, locale, messages }: AffiliateApplicationsScreenProps) {
  const text = messages.affiliateApplications
  const router = useRouter()
  const params = useSearchParams()
  const status = statusOf(params.get("status"))
  const page = Math.max(Number(params.get("page") ?? 1) || 1, 1)
  const list = useAffiliateApplications(slug, status, page)
  const program = useAffiliateProgram(slug)
  const pageSettings = useAffiliatePage(slug)
  const decide = useDecideAffiliateApplication(slug)
  // The application being decided, and on which table an approval goes; nothing is held of the API's data.
  const [approving, setApproving] = useState<AffiliateApplicationView | null>(null)
  const [refusing, setRefusing] = useState<AffiliateApplicationView | null>(null)
  const [tableId, setTableId] = useState("")

  const hrefOf = (next: AffiliateApplicationStatusValue, nextPage = 1) => `/admin/${slug}/affiliates/applications?status=${next}${nextPage > 1 ? `&page=${nextPage}` : ""}`
  const frame = (body: ReactNode) => (
    <AffiliatesFrame slug={slug} active="applications" messages={messages}>
      <p className="text-muted-foreground text-sm">{text.notice}</p>
      {body}
    </AffiliatesFrame>
  )

  if (list.isPending || program.isPending) return frame(<AffiliatesSkeleton />)
  if (list.isError || program.isError) return frame(<AffiliatesFailed onRetry={() => void Promise.all([list.refetch(), program.refetch()])} messages={messages} />)

  const tables = affiliateTableOptionsOf(program.data.tables, locale)
  const announced = pageSettings.data?.page.tableId ?? program.data.tables.find((table) => table.isDefault)?.id ?? ""
  const received = applicationReceivedFormatter(locale)
  const error = decide.error ? applicationErrorOf(decide.error instanceof AffiliateError ? decide.error.errorCode : "UNKNOWN", text.errors) : undefined

  function close() {
    decide.reset()
    setApproving(null)
    setRefusing(null)
  }

  return frame(
    <>
      <AffiliateApplicationsList
        status={status}
        filterHrefs={{ PENDING: hrefOf("PENDING"), APPROVED: hrefOf("APPROVED"), REFUSED: hrefOf("REFUSED") }}
        pendingCount={list.data.pendingCount}
        applications={list.data.applications.map((application) => applicationViewOf(application, text, received))}
        onApprove={(application) => {
          decide.reset()
          setTableId(announced)
          setApproving(application)
        }}
        onRefuse={(application) => {
          decide.reset()
          setRefusing(application)
        }}
        busyId={decide.isPending ? (approving?.id ?? refusing?.id ?? null) : null}
        linkComponent={AppLink}
        messages={messages}
      />
      <TablePager
        page={list.data.page}
        pageSize={list.data.pageSize}
        total={list.data.total}
        busy={list.isFetching}
        onPageChange={(next) => router.replace(hrefOf(status, next) as Parameters<typeof router.replace>[0])}
        previousLabel={messages.affiliates.list.previous}
        nextLabel={messages.affiliates.list.next}
        rangeLabel={(from, to, total) => format(messages.affiliates.list.range, { from: String(from), to: String(to), total: String(total) })}
      />
      <AffiliateApplicationApproveDialog
        application={approving}
        tables={tables}
        tableId={tableId}
        onTableChange={setTableId}
        onConfirm={() => approving && decide.mutate({ applicationId: approving.id, act: "approve", approval: { tableId } }, { onSuccess: close })}
        onCancel={close}
        pending={decide.isPending}
        error={approving ? error : undefined}
        messages={messages}
      />
      <AffiliateConfirmDialog
        text={refusing ? { title: format(text.refuseDialog.title, { name: refusing.name }), question: text.refuseDialog.body, detail: error ?? "", confirm: text.refuseDialog.confirm, confirming: text.refuseDialog.confirm } : null}
        keepLabel={text.refuseDialog.cancel}
        onConfirm={() => refusing && decide.mutate({ applicationId: refusing.id, act: "refuse" }, { onSuccess: close })}
        onCancel={close}
        pending={decide.isPending}
      />
    </>,
  )
}
