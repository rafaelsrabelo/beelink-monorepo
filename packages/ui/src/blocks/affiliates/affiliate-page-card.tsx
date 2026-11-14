"use client"

// React
import { useId, type FormEvent } from "react"

// Libs
import { CheckIcon, CopyIcon, ExternalLinkIcon } from "lucide-react"

// UI
import { Badge } from "@harness-monorepo/ui/components/badge"
import { Button, buttonVariants } from "@harness-monorepo/ui/components/button"
import { Checkbox } from "@harness-monorepo/ui/components/checkbox"
import { Field, FieldContent, FieldDescription, FieldLabel, FieldLegend, FieldSet } from "@harness-monorepo/ui/components/field"
import { RadioGroup, RadioGroupItem } from "@harness-monorepo/ui/components/radio-group"
import { Switch } from "@harness-monorepo/ui/components/switch"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { AffiliatePageCardValues } from "@harness-monorepo/ui/lib/affiliate-page"
import type { AffiliateTableOption } from "@harness-monorepo/ui/lib/affiliates"
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { AffiliateTableSelect } from "./affiliate-table-select"

const PLACEMENTS = ["homeBanner", "footerLink", "topStrip"] as const
const APPROVALS = ["MANUAL", "AUTO"] as const

export interface AffiliatePageCardProps {
  value: AffiliatePageCardValues
  onChange: (value: AffiliatePageCardValues) => void
  onSubmit: () => void
  /** The page's address as a visitor types it: `lojaexemplo.com.br/seja-afiliado`. */
  address: string
  viewHref: string
  editHref: string
  /** The shop's shared tables, the default one first. */
  tables: readonly AffiliateTableOption[]
  /** Whether visitors see the page now, and what is said of it. */
  status: { live: boolean; message: string }
  onCopy: () => void
  copied?: boolean
  pending?: boolean
  /** The API's refusal, in words. */
  error?: string
  saved?: boolean
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The shop's "Seja afiliado" page in the programme's settings (plan 2026-11-14): whether it takes
 * applications, its address to copy and to see, the way to its texts, where the shop window leads to
 * it, the table it announces and how an application is decided. Values are what is chosen; the
 * screen saves them with the texts as they stand.
 */
export function AffiliatePageCard({ value, onChange, onSubmit, address, viewHref, editHref, tables, status, onCopy, copied = false, pending = false, error, saved = false, linkComponent: Link = AnchorLink, messages = defaultMessages }: AffiliatePageCardProps) {
  const text = messages.affiliatePage.card
  const id = useId()
  const set = (patch: Partial<AffiliatePageCardValues>) => onChange({ ...value, ...patch })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form noValidate onSubmit={submit} aria-labelledby={`${id}-title`} className="bg-shell-surface border-shell-border flex flex-col gap-5 rounded-xl border p-4 shadow-xs sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 id={`${id}-title`} className="flex items-center gap-2 font-semibold">
          {text.title}
          <Badge variant="secondary">{text.badge}</Badge>
        </h2>
        <p className="text-muted-foreground text-sm">{text.intro}</p>
      </div>

      <Field orientation="horizontal">
        <Switch id={`${id}-open`} checked={value.open} disabled={pending} aria-describedby={`${id}-open-help`} onCheckedChange={(open: boolean) => set({ open })} />
        <FieldContent>
          <FieldLabel htmlFor={`${id}-open`}>{text.open}</FieldLabel>
          <FieldDescription id={`${id}-open-help`}>{format(text.openHelp, { address })}</FieldDescription>
        </FieldContent>
      </Field>
      <p className={cn("text-sm", status.live ? "text-success-foreground" : "text-muted-foreground")}>{status.message}</p>

      <div className="flex flex-col gap-2">
        <p id={`${id}-address`} className="text-sm font-medium">
          {text.address}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <code aria-labelledby={`${id}-address`} className="bg-muted min-w-0 flex-1 truncate rounded-md px-3 py-2 text-sm">
            {address}
          </code>
          <Button type="button" variant="outline" onClick={onCopy}>
            {copied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
            {copied ? text.copied : text.copy}
          </Button>
          <Link href={viewHref} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>
            <ExternalLinkIcon aria-hidden="true" />
            {text.view}
          </Link>
        </div>
        <p className="text-muted-foreground text-sm">{text.addressHelp}</p>
      </div>

      <div className="bg-muted/50 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-sm font-medium">{text.content}</p>
          <p className="text-muted-foreground text-sm">{text.contentHelp}</p>
        </div>
        <Link href={editHref} className={buttonVariants()}>
          {text.editContent}
        </Link>
      </div>

      <FieldSet>
        <FieldLegend>{text.placements}</FieldLegend>
        {PLACEMENTS.map((key) => (
          <Field key={key} orientation="horizontal">
            <Checkbox id={`${id}-${key}`} checked={value[key]} disabled={pending} onCheckedChange={(checked: boolean) => set({ [key]: checked })} />
            <FieldLabel htmlFor={`${id}-${key}`} className="font-normal">
              {text[key]}
            </FieldLabel>
          </Field>
        ))}
      </FieldSet>

      <Field className="max-w-md">
        <FieldLabel htmlFor={`${id}-table`}>{text.table}</FieldLabel>
        <AffiliateTableSelect id={`${id}-table`} tables={tables} value={value.tableId} onChange={(tableId) => set({ tableId })} disabled={pending} describedBy={`${id}-table-help`} />
        <FieldDescription id={`${id}-table-help`}>{text.tableHelp}</FieldDescription>
      </Field>

      <FieldSet>
        <FieldLegend id={`${id}-approval`}>{text.approval}</FieldLegend>
        <RadioGroup value={value.approval} onValueChange={(next) => set({ approval: next === "AUTO" ? "AUTO" : "MANUAL" })} disabled={pending} aria-labelledby={`${id}-approval`} className="flex flex-col gap-3">
          {APPROVALS.map((approval) => (
            <Field key={approval} orientation="horizontal" className="rounded-lg border p-3">
              <RadioGroupItem id={`${id}-${approval}`} value={approval} aria-describedby={`${id}-${approval}-help`} />
              <FieldContent>
                <FieldLabel htmlFor={`${id}-${approval}`}>{approval === "MANUAL" ? text.manual : text.auto}</FieldLabel>
                <FieldDescription id={`${id}-${approval}-help`}>{approval === "MANUAL" ? text.manualHelp : text.autoHelp}</FieldDescription>
              </FieldContent>
            </Field>
          ))}
        </RadioGroup>
      </FieldSet>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? text.saving : text.save}
        </Button>
        {/* In the page before there is anything to say, so a reader hears the answer arrive. */}
        <p aria-live="polite" className={error ? "text-destructive text-sm" : "text-muted-foreground text-sm"}>
          {error ?? (saved ? text.saved : null)}
        </p>
      </div>
    </form>
  )
}
