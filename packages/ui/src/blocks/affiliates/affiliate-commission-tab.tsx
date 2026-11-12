"use client"

// React
import { useId } from "react"

// UI
import { Button, buttonVariants } from "@harness-monorepo/ui/components/button"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { AffiliateCommissionView, AffiliateTableOption } from "@harness-monorepo/ui/lib/affiliates"
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { SettingsRow } from "../shared/settings-row"
import { SettingsSection } from "../shared/settings-section"
import { AffiliateTableSelect } from "./affiliate-table-select"

export interface AffiliateCommissionTabProps {
  tables: readonly AffiliateTableOption[]
  /** The table chosen in the select — the saved one until changed. */
  tableId: string
  onTable: (tableId: string) => void
  onSaveTable: () => void
  /** The select differs from what is saved. */
  tableChanged?: boolean
  /** An ended affiliate's table no longer pays anything: it stays shown, and does not change. */
  tableLocked?: boolean
  /** On their own commission: where its table is edited. */
  own?: { editHref: string } | null
  /** On a shared table: give them their own, starting from it. */
  onMakeOwn?: () => void
  makingOwn?: boolean
  /** Where the table they are on is seen whole. */
  tableHref: string
  /** What the table pays, in words; null while it is read. */
  commission: AffiliateCommissionView | null
  pending?: boolean
  saved?: boolean
  /** The API's refusal, in words. */
  error?: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The record's "Comissão" tab (12/11/2026): the table the affiliate is on — changed here, or made
 * their own — and what it pays: the general rate, the categories with a rate of their own and how
 * many products have one.
 */
export function AffiliateCommissionTab({ tables, tableId, onTable, onSaveTable, tableChanged = false, tableLocked = false, own = null, onMakeOwn, makingOwn = false, tableHref, commission, pending = false, saved = false, error, linkComponent: Link = AnchorLink, messages = defaultMessages }: AffiliateCommissionTabProps) {
  const text = messages.affiliates.record
  const id = useId()
  const reading = <Skeleton className="h-5 w-32" />

  return (
    <div className="flex flex-col gap-8">
      <SettingsSection title={text.tabs.commission}>
        <SettingsRow
          label={text.table}
          htmlFor={`${id}-table`}
          hint={text.tableHelp}
          action={
            tableChanged ? (
              <Button type="button" size="sm" disabled={pending} onClick={onSaveTable}>
                {pending ? text.saving : text.save}
              </Button>
            ) : null
          }
        >
          <div className="flex max-w-sm flex-col gap-1.5">
            <AffiliateTableSelect id={`${id}-table`} tables={tables} value={tableId} disabled={pending || tableLocked} onChange={onTable} />
            <p role="status" className="text-muted-foreground text-sm empty:hidden">
              {saved && !tableChanged ? text.saved : ""}
            </p>
          </div>
        </SettingsRow>
        <SettingsRow
          label={text.ownCommission}
          hint={text.ownCommissionHelp}
          action={
            own ? (
              <Link href={own.editHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
                {text.editCommission}
              </Link>
            ) : onMakeOwn && !tableLocked ? (
              <Button type="button" variant="outline" size="sm" disabled={pending || makingOwn} onClick={onMakeOwn}>
                {makingOwn ? text.makingOwn : text.makeOwn}
              </Button>
            ) : null
          }
        >
          {own ? text.ownCommission : <span className="text-muted-foreground">{text.none}</span>}
        </SettingsRow>
        <SettingsRow label={text.generalRate} hint={text.generalRateHelp}>
          {commission ? <span className="text-base font-semibold tabular-nums">{commission.general}</span> : reading}
        </SettingsRow>
        <SettingsRow label={text.byCategory}>
          {commission ? (
            commission.categories.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {commission.categories.map((category) => (
                  <li key={category.name} className="bg-muted rounded-full px-3 py-1 text-sm">
                    {category.name} · <span className="font-semibold tabular-nums">{category.rate}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-muted-foreground">{text.noOwnRates}</span>
            )
          ) : (
            reading
          )}
        </SettingsRow>
        <SettingsRow
          label={text.byProduct}
          action={
            <Link href={tableHref} className={buttonVariants({ variant: "ghost", size: "sm" })}>
              {text.seeTable}
            </Link>
          }
        >
          {commission ? commission.productsOwn > 0 ? format(text.productsOwn, { count: String(commission.productsOwn) }) : <span className="text-muted-foreground">{text.productsNone}</span> : reading}
        </SettingsRow>
      </SettingsSection>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  )
}
