"use client"

// React
import { useState } from "react"

// Types
import type { LeadStatus } from "@harness-monorepo/contracts"

// UI
import { LeadDetail } from "@harness-monorepo/ui/blocks/leads/lead-detail"
import { LeadTable } from "@harness-monorepo/ui/blocks/leads/lead-table"
import { TablePager } from "@harness-monorepo/ui/blocks/catalog/table-pager"
import { ConfirmDelete } from "@harness-monorepo/ui/blocks/shared/confirm-delete"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@harness-monorepo/ui/components/sheet"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@harness-monorepo/ui/components/toggle-group"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { WebMessages } from "@/locales"
import { pageErrorCopy } from "@/components/design/page-error-copy"
import { useDeleteLead, useLeads, useUpdateLeadStatus } from "@/services/leads/lead-hooks"

const FILTERS = ["ALL", "NEW", "CONTACTED", "WON", "LOST"] as const
type Filter = (typeof FILTERS)[number]

export interface LeadsScreenProps {
  slug: string
  messages: UiMessages
  web: WebMessages
}

/**
 * What arrived through the site's form: the table, a status filter, and one lead opened beside it.
 *
 * The filter and the page are screen state, not the address — unlike the product list, nobody
 * sends a link to "the leads I already answered", and a status changed in place would otherwise
 * have to rewrite the URL under the person's cursor.
 */
export function LeadsScreen({ slug, messages, web }: LeadsScreenProps) {
  const text = messages.leads
  const [filter, setFilter] = useState<Filter>("ALL")
  const [page, setPage] = useState(1)
  const [openId, setOpenId] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  const leads = useLeads(slug, { ...(filter === "ALL" ? {} : { status: filter }), page })
  const move = useUpdateLeadStatus(slug)
  const remove = useDeleteLead(slug)

  const rows = leads.data?.leads ?? []
  const open = rows.find((lead) => lead.id === openId) ?? null
  const changeStatus = (leadId: string, status: LeadStatus) => move.mutate({ leadId, status })

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 lg:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{text.title}</h1>
        <p className="text-muted-foreground text-sm">{text.description}</p>
      </header>

      <ToggleGroup
        aria-label={text.filterLabel}
        value={[filter]}
        onValueChange={(next: string[]) => {
          setFilter((next[0] as Filter | undefined) ?? "ALL")
          setPage(1)
        }}
        className="flex-wrap"
      >
        {FILTERS.map((option) => (
          <ToggleGroupItem key={option} value={option} variant="outline">
            {option === "ALL" ? text.all : text.statuses[option]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {move.error ? <p role="alert" className="text-destructive text-sm">{pageErrorCopy(move.error, web)}</p> : null}

      {leads.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : (
        <>
          <LeadTable
            leads={rows}
            filtered={filter !== "ALL"}
            onOpen={setOpenId}
            onStatusChange={changeStatus}
            busyId={move.isPending ? (move.variables?.leadId ?? null) : null}
            messages={messages}
          />
          <TablePager
            page={leads.data?.page ?? page}
            pageSize={leads.data?.pageSize ?? 20}
            total={leads.data?.total ?? 0}
            onPageChange={setPage}
            busy={leads.isFetching}
            previousLabel={text.previous}
            nextLabel={text.next}
            rangeLabel={(from, to, total) =>
              format(text.range, { from: String(from), to: String(to), total: String(total) })
            }
          />
        </>
      )}

      <Sheet open={open !== null} onOpenChange={(next) => (next ? undefined : setOpenId(null))}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{text.title}</SheetTitle>
          </SheetHeader>
          {open ? (
            <div className="px-4 pb-4">
              <LeadDetail
                lead={open}
                onStatusChange={(status) => changeStatus(open.id, status)}
                onDelete={() => setConfirming(true)}
                busy={move.isPending || remove.isPending}
                messages={messages}
              />
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <ConfirmDelete
        question={confirming && open ? format(text.deleteConfirm, { name: open.name }) : null}
        pending={remove.isPending}
        {...(remove.error ? { detail: pageErrorCopy(remove.error, web) } : {})}
        onConfirm={() => {
          if (!open) return
          remove.mutate(open.id, {
            onSuccess: () => {
              setConfirming(false)
              setOpenId(null)
            },
          })
        }}
        onCancel={() => setConfirming(false)}
        messages={messages}
      />
    </div>
  )
}
