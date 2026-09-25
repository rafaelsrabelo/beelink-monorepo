// UI
import { Badge } from "@harness-monorepo/ui/components/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@harness-monorepo/ui/components/table"

// Locales
import { defaultLocale, defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

/** Where a customer stands with the shop. Mirrors the wire's `CustomerStage`; this package imports no contracts. */
export type CustomerTableStage = "LEAD" | "CUSTOMER" | "INACTIVE"

/** Filled for who buys now, muted for who never did, outlined for who stopped. */
const STAGE_VARIANT: Record<CustomerTableStage, "default" | "secondary" | "outline"> = {
  CUSTOMER: "default",
  LEAD: "secondary",
  INACTIVE: "outline",
}

export interface CustomerTableItem {
  id: string
  name: string
  email: string | null
  emailVerified: boolean
  /** Digits, as stored. Drawn as they are: a mask would have to guess the country. */
  phone: string | null
  city: string | null
  state: string | null
  stage: CustomerTableStage
  /** ISO-8601. */
  createdAt: string
}

export interface CustomerTableProps {
  customers: readonly CustomerTableItem[]
  /** A search is on, so an empty list means "no one matches", not "no one yet". */
  searching?: boolean
  locale?: string
  messages?: UiMessages
}

/**
 * Who opened an account at the shop, newest first: how to reach them, where they are, and where they
 * stand — a lead until they buy.
 */
export function CustomerTable({ customers, searching = false, locale = defaultLocale, messages = defaultMessages }: CustomerTableProps) {
  const text = messages.customers
  const when = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" })

  if (!customers.length) {
    return (
      <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed py-12 text-center">
        <p className="font-medium">{searching ? text.emptySearch : text.empty}</p>
        {searching ? null : <p className="text-muted-foreground text-sm">{text.emptyHint}</p>}
      </div>
    )
  }

  return (
    <div className="bg-shell-surface border-shell-border rounded-xl border shadow-xs">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead>{text.name}</TableHead>
            <TableHead>{text.contact}</TableHead>
            <TableHead className="w-40">{text.place}</TableHead>
            <TableHead className="w-28">{text.stage}</TableHead>
            <TableHead className="w-36">{text.since}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => (
            <TableRow key={customer.id}>
              <TableCell className="font-medium">{customer.name}</TableCell>
              <TableCell className="text-muted-foreground">
                <div className="flex flex-col">
                  {customer.email ? (
                    <span>
                      {customer.email}
                      {customer.emailVerified ? null : <span className="text-xs"> · {text.unverified}</span>}
                    </span>
                  ) : null}
                  {customer.phone ? <span>{customer.phone}</span> : null}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{[customer.city, customer.state].filter(Boolean).join(" / ") || "—"}</TableCell>
              <TableCell>
                <Badge variant={STAGE_VARIANT[customer.stage]}>{text.stages[customer.stage]}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums">{when.format(new Date(customer.createdAt))}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
