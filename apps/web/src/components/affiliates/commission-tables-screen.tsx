"use client"

// React
import { useState } from "react"

// UI
import { AffiliatesFailed } from "@harness-monorepo/ui/blocks/affiliates/affiliates-failed"
import { AffiliatesSkeleton } from "@harness-monorepo/ui/blocks/affiliates/affiliates-skeleton"
import { CommissionTableDialog } from "@harness-monorepo/ui/blocks/affiliates/commission-table-dialog"
import { CommissionTableList } from "@harness-monorepo/ui/blocks/affiliates/commission-table-list"
import { ConfirmDelete } from "@harness-monorepo/ui/blocks/shared/confirm-delete"
import type { CommissionTableFormValues, CommissionTableIssues, CommissionTableView } from "@harness-monorepo/ui/lib/affiliates"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import { affiliateErrorOf, commissionTableFormOf, commissionTablePayloadOf, EMPTY_COMMISSION_TABLE } from "@/lib/affiliate-form"
import { AffiliateError } from "@/services/affiliates/affiliate-requests"
import { useAffiliateProgram, useCreateCommissionTable, useDeleteCommissionTable, useUpdateCommissionTable } from "@/services/affiliates/affiliate-hooks"
import { AffiliatesFrame } from "./affiliates-frame"

export interface CommissionTablesScreenProps {
  slug: string
  locale: string
  messages: UiMessages
}

/** The table in the dialog: a new one, or the one being changed. */
type Editing = { mode: "create" } | { mode: "edit"; table: CommissionTableView }

const codeOf = (error: Error | null): string => (error instanceof AffiliateError ? error.errorCode : "UNKNOWN")

/**
 * The shop's commission tables (IMPULSEIA-102): listed from the programme's read, created and changed
 * in a dialog, deleted after a question — never the default one, which the list offers no delete for.
 */
export function CommissionTablesScreen({ slug, locale, messages }: CommissionTablesScreenProps) {
  const text = messages.affiliates
  const overview = useAffiliateProgram(slug)
  const create = useCreateCommissionTable(slug)
  const update = useUpdateCommissionTable(slug)
  const remove = useDeleteCommissionTable(slug)
  const [editing, setEditing] = useState<Editing | null>(null)
  const [value, setValue] = useState<CommissionTableFormValues>(EMPTY_COMMISSION_TABLE)
  const [issues, setIssues] = useState<CommissionTableIssues>({})
  const [deleting, setDeleting] = useState<CommissionTableView | null>(null)

  if (overview.isPending) return <AffiliatesFrame slug={slug} active="tables" messages={messages}><AffiliatesSkeleton shape="list" /></AffiliatesFrame>
  if (overview.isError) return <AffiliatesFrame slug={slug} active="tables" messages={messages}><AffiliatesFailed onRetry={() => void overview.refetch()} messages={messages} /></AffiliatesFrame>

  const saving = editing?.mode === "edit" ? update : create

  function open(next: Editing) {
    create.reset()
    update.reset()
    setIssues({})
    setValue(next.mode === "edit" ? commissionTableFormOf(next.table) : EMPTY_COMMISSION_TABLE)
    setEditing(next)
  }

  function submit() {
    const result = commissionTablePayloadOf(value, text.issues)
    if ("issues" in result) return setIssues(result.issues)
    const done = { onSuccess: () => setEditing(null) }
    if (editing?.mode === "edit") update.mutate({ tableId: editing.table.id, payload: result.payload }, done)
    else create.mutate(result.payload, done)
  }

  function confirmDelete() {
    if (!deleting) return
    remove.mutate(deleting.id, { onSettled: () => setDeleting(null) })
  }

  return (
    <AffiliatesFrame slug={slug} active="tables" messages={messages}>
      <CommissionTableList
        tables={overview.data.tables}
        hrefOf={(tableId) => `/admin/${slug}/affiliates/tables/${tableId}`}
        onCreate={() => open({ mode: "create" })}
        onEdit={(table) => open({ mode: "edit", table })}
        onDelete={(table) => {
          remove.reset()
          setDeleting(table)
        }}
        busyId={remove.isPending ? remove.variables : null}
        locale={locale}
        linkComponent={AppLink}
        messages={messages}
      />
      {remove.error ? (
        <p role="alert" className="text-destructive text-sm">
          {affiliateErrorOf(codeOf(remove.error), text.errors)}
        </p>
      ) : null}

      <CommissionTableDialog
        open={editing !== null}
        onOpenChange={(next) => {
          if (!next) setEditing(null)
        }}
        mode={editing?.mode ?? "create"}
        value={value}
        onChange={(next) => {
          setIssues({})
          setValue(next)
        }}
        onSubmit={submit}
        issues={issues}
        pending={saving.isPending}
        error={saving.error ? affiliateErrorOf(codeOf(saving.error), text.errors) : undefined}
        messages={messages}
      />
      <ConfirmDelete
        question={deleting ? format(text.tables.deleteConfirm, { name: deleting.name }) : null}
        detail={text.tables.deleteHint}
        pending={remove.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
        messages={messages}
      />
    </AffiliatesFrame>
  )
}
