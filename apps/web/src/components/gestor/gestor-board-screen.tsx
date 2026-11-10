"use client"

// React
import { useEffect, useState } from "react"

// Next
import { useRouter, useSearchParams } from "next/navigation"

// UI
import { GestorBoard } from "@harness-monorepo/ui/blocks/gestor/gestor-board"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@harness-monorepo/ui/components/alert-dialog"
import { Button, buttonVariants } from "@harness-monorepo/ui/components/button"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import { orderPaymentStateOf } from "@harness-monorepo/ui/lib/order-payment"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { WebMessages } from "@/locales"
import { AppLink } from "@/components/app-link"
import { pageErrorCopy } from "@/components/design/page-error-copy"
import { gestorColumnsOf, gestorHrefOf, gestorOrderHrefOf, WAITING_EVERY_MS } from "@/lib/gestor-board"
import { useMoveOrder, useOrders } from "@/services/orders/order-hooks"
import { GestorOrderSheet } from "./gestor-order-sheet"

/** As many open orders as a counter holds at once; past it, the oldest are still in "Ver todos os pedidos". */
const OPEN_SHOWN = 100
const DONE_SHOWN = 5
const MINUTE = 60_000

export interface GestorBoardScreenProps {
  slug: string
  locale: string
  messages: UiMessages
  web: WebMessages
}

/**
 * The manager's board (plan 2026-11-10--modo-gestor): the open orders in their columns and the last
 * ones delivered, an order opened beside them by the address (`?pedido=`), accepting from a card and
 * refusing with a yes — or, for an order that holds its customer's money, on its refund's screen.
 */
export function GestorBoardScreen({ slug, locale, messages, web }: GestorBoardScreenProps) {
  const text = messages.gestor.board
  const router = useRouter()
  const params = useSearchParams()
  const opened = Math.max(Number(params.get("pedido")) || 0, 0) || null
  const tab = params.get("aba") === "conversa" ? "conversa" : "pedido"

  const open = useOrders(slug, { status: "OPEN", pageSize: OPEN_SHOWN }, { refetchInterval: WAITING_EVERY_MS })
  const done = useOrders(slug, { status: "DELIVERED", pageSize: DONE_SHOWN })
  const move = useMoveOrder(slug)
  const [refusing, setRefusing] = useState<number | null>(null)

  // "há 3 min." keeps counting while nothing else changes.
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), MINUTE)
    return () => window.clearInterval(timer)
  }, [])

  if (open.isPending) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-9 w-40" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((column) => (
            <Skeleton key={column} className="h-72 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!open.data) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p role="alert" className="text-destructive text-sm">
          {pageErrorCopy(open.error, web) ?? text.failed}
        </p>
        <Button type="button" variant="outline" onClick={() => void open.refetch()}>
          {text.retry}
        </Button>
      </div>
    )
  }

  const orders = open.data.orders
  const refuse = (number: number) => {
    const order = orders.find((candidate) => candidate.number === number)
    // An order that holds money is cancelled with its refund, which has a screen of its own (BEELINK-208).
    if (order && orderPaymentStateOf(order) === "paid") router.push(`/admin/${slug}/orders/${number}/refund?cancel=1` as Parameters<typeof router.push>[0])
    else setRefusing(number)
  }

  return (
    <>
      {move.error ? (
        <p role="alert" className="text-destructive text-sm">
          {pageErrorCopy(move.error, web)}
        </p>
      ) : null}
      <GestorBoard
        columns={gestorColumnsOf(orders, done.data?.orders ?? [], { slug, locale, messages, now })}
        onAccept={(number) => move.mutate({ number, status: "ACCEPTED" })}
        onRefuse={refuse}
        pendingNumber={move.isPending ? (move.variables?.number ?? null) : null}
        current={opened}
        allOrdersHref={`/admin/${slug}/orders`}
        newSaleHref={`/admin/${slug}/orders/new`}
        linkComponent={AppLink}
        messages={messages}
      />

      <AlertDialog open={refusing !== null} onOpenChange={(next: boolean) => (next ? undefined : setRefusing(null))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{format(text.refuseTitle, { number: String(refusing ?? "") })}</AlertDialogTitle>
            <AlertDialogDescription>{text.refuseText}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{text.refuseKeep}</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={() => {
                if (refusing !== null) move.mutate({ number: refusing, status: "CANCELLED" })
                setRefusing(null)
              }}
            >
              {text.refuseConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {opened ? (
        <GestorOrderSheet
          slug={slug}
          number={opened}
          tab={tab}
          onTab={(next) => router.replace(gestorOrderHrefOf(slug, opened, next) as Parameters<typeof router.replace>[0])}
          onClose={() => router.replace(gestorHrefOf(slug) as Parameters<typeof router.replace>[0])}
          locale={locale}
          messages={messages}
          web={web}
        />
      ) : null}
    </>
  )
}
