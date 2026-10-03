"use client"

// React
import { useId, useState, type FormEvent } from "react"

// Libs
import { PrinterIcon, TagIcon } from "lucide-react"

// UI
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@harness-monorepo/ui/components/alert-dialog"
import { Button } from "@harness-monorepo/ui/components/button"
import type { OrderLabelCardView, OrderLabelFormValues, OrderLabelIssues, OrderLabelNote } from "@harness-monorepo/ui/lib/label"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { OrderLabelForm } from "./order-label-form"

export interface OrderLabelCardProps {
  view: OrderLabelCardView
  value: OrderLabelFormValues
  onChange: (value: OrderLabelFormValues) => void
  /** Buy the label — or carry on buying it from where it stopped. */
  onBuy: () => void
  onPrint: () => void
  onCancel: () => void
  issues?: OrderLabelIssues
  /** What is under way. */
  pending?: "buy" | "print" | "cancel" | null
  /** Why the last step did not go through, in words, with the way to act on it. */
  error?: OrderLabelNote | null
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** A sentence and its link: the panel's own, or Melhor Envio's site in a tab of its own. */
function NoteLink({ note, Link }: { note: OrderLabelNote; Link: LinkComponent }) {
  if (!note.href || !note.linkLabel) return null
  const style = "text-sm font-medium underline underline-offset-4"
  return note.external ? (
    <a href={note.href} target="_blank" rel="noreferrer" className={style}>
      {note.linkLabel}
    </a>
  ) : (
    <Link href={note.href} className={style}>
      {note.linkLabel}
    </Link>
  )
}

/**
 * An order's shipping label on the panel's order (BEELINK-187): what stands in the way of buying one,
 * the box and the invoice to buy it with, and — once bought — its tracking, the PDF to print, and the
 * way to cancel it while Melhor Envio allows. Every amount and date arrives in words.
 */
export function OrderLabelCard({ view, value, onChange, onBuy, onPrint, onCancel, issues, pending = null, error = null, linkComponent: Link = AnchorLink, messages = defaultMessages }: OrderLabelCardProps) {
  const text = messages.orders.label
  const id = useId()
  const [confirming, setConfirming] = useState(false)
  const label = view.label
  const buying = !label || label.status === "IN_CART" || label.status === "CANCELLED"
  const busy = pending !== null

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!busy) onBuy()
  }

  return (
    <section aria-labelledby={`${id}-title`} className="bg-shell-surface border-shell-border flex flex-col gap-4 rounded-xl border p-4 shadow-xs">
      <div className="flex items-start gap-3">
        <TagIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={`${id}-title`} className="font-semibold">
            {text.title}
          </h2>
          <p className="text-muted-foreground text-sm">{format(text.intro, { carrier: view.carrier })}</p>
        </div>
      </div>

      {label ? <p className="text-sm font-medium">{label.statusText}</p> : null}
      {label?.status === "GENERATED" ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          {label.protocol ? (
            <>
              <dt className="text-muted-foreground">{text.protocol}</dt>
              <dd className="tabular-nums">{label.protocol}</dd>
            </>
          ) : null}
          <dt className="text-muted-foreground">{text.tracking}</dt>
          <dd className="tabular-nums">{label.trackingCode ?? text.trackingPending}</dd>
        </dl>
      ) : null}

      {view.blockers.length ? (
        <div className="bg-muted flex flex-col gap-2 rounded-lg p-3">
          <p className="text-sm font-semibold">{text.blockersTitle}</p>
          <ul className="flex flex-col gap-2">
            {view.blockers.map((note) => (
              <li key={note.text} className="flex flex-col items-start gap-1 text-sm">
                {note.text}
                <NoteLink note={note} Link={Link} />
              </li>
            ))}
          </ul>
        </div>
      ) : buying ? (
        <form noValidate onSubmit={submit} className="flex flex-col gap-4">
          <OrderLabelForm value={value} onChange={onChange} issues={issues} disabled={busy} messages={messages} />
          <p className="text-muted-foreground text-sm">{view.balance ? format(text.balance, { balance: view.balance }) : text.balanceUnknown}</p>
          <Button type="submit" disabled={busy} className="self-start">
            {pending === "buy" ? text.buying : label?.status === "IN_CART" ? text.retry : text.buy}
          </Button>
        </form>
      ) : label?.status === "PAID" ? (
        <Button type="button" disabled={busy} className="self-start" onClick={onBuy}>
          {pending === "buy" ? text.buying : text.generate}
        </Button>
      ) : null}

      {label && label.status !== "CANCELLED" && !view.blockers.length ? (
        <div className="flex flex-wrap gap-2">
          {label.status === "GENERATED" ? (
            <Button type="button" disabled={busy} onClick={onPrint}>
              <PrinterIcon aria-hidden="true" />
              {pending === "print" ? text.printing : text.print}
            </Button>
          ) : null}
          <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirming(true)}>
            {pending === "cancel" ? text.cancelling : text.cancel}
          </Button>
        </div>
      ) : null}

      {error ? (
        <div role="alert" className="text-destructive flex flex-col items-start gap-1 text-sm">
          {error.text}
          <NoteLink note={error} Link={Link} />
        </div>
      ) : null}

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{text.cancelConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{text.cancelConfirmText}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{text.keep}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirming(false)
                onCancel()
              }}
            >
              {text.cancelConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
