"use client"

// React
import { useEffect, type ReactNode } from "react"

// Next
import { usePathname } from "next/navigation"

// UI
import { GestorFrame } from "@harness-monorepo/ui/blocks/gestor/gestor-frame"
import { GestorStart } from "@harness-monorepo/ui/blocks/gestor/gestor-start"
import type { GestorNavKey } from "@harness-monorepo/ui/blocks/gestor/gestor-frame"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import { PageLockGate } from "@/components/billing/page-lock-gate"
import { gestorConversationsHrefOf, gestorCouponsHrefOf, gestorHrefOf, WAITING_EVERY_MS } from "@/lib/gestor-board"
import { useOrders } from "@/services/orders/order-hooks"
import { usePanelCounts } from "@/services/panel/panel-counts-hooks"
import { useStore } from "@/services/stores/store-hooks"
import { useGestor } from "@/stores/gestor"
import { GestorRealtime } from "./gestor-realtime"
import { useGestorBell } from "./use-gestor-bell"
import { useWakeLock } from "./use-wake-lock"

export interface GestorShellProps {
  slug: string
  locale: string
  messages: UiMessages
  children: ReactNode
}

function placeOf(pathname: string): GestorNavKey {
  if (pathname.endsWith("/gestor/cupons")) return "coupons"
  if (pathname.endsWith("/gestor/conversas")) return "conversations"
  return "orders"
}

/**
 * The manager around its three screens (plan 2026-11-10--modo-gestor): the frame, the channel, and
 * the bell — here and not on the board, so it rings on the coupons and the conversations too. It
 * rings while any order waits to be accepted, once the opening tap gave it the browser's leave, and
 * that same tap keeps the screen on.
 */
export function GestorShell({ slug, locale, messages, children }: GestorShellProps) {
  const pathname = usePathname()
  const store = useStore(slug)
  const counts = usePanelCounts(slug)
  const received = useOrders(slug, { status: "RECEIVED", pageSize: 1 }, { refetchInterval: WAITING_EVERY_MS })
  const { started, soundOn, start, setSound } = useGestor()
  const waiting = received.data?.total ?? 0
  const bell = useGestorBell(started && soundOn && waiting > 0)
  useWakeLock(started)

  // A tab behind another still says an order waits.
  useEffect(() => {
    if (waiting === 0) return
    const before = document.title
    document.title = format(messages.gestor.titleRinging, { count: String(waiting) })
    return () => {
      document.title = before
    }
  }, [waiting, messages.gestor.titleRinging])

  const today = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", timeZone: "America/Sao_Paulo" }).format(new Date())

  return (
    <GestorFrame
      shopName={store.data?.name ?? ""}
      today={today}
      nav={[
        { key: "orders", href: gestorHrefOf(slug), count: waiting },
        { key: "coupons", href: gestorCouponsHrefOf(slug) },
        { key: "conversations", href: gestorConversationsHrefOf(slug), count: counts.data?.unreadConversations ?? 0 },
      ]}
      current={placeOf(pathname)}
      backHref={`/admin/${slug}`}
      soundOn={soundOn}
      onSoundChange={(on) => {
        setSound(on)
        if (on) bell.unlock()
      }}
      onTestSound={bell.test}
      linkComponent={AppLink}
      messages={messages}
    >
      <PageLockGate realtime={<GestorRealtime slug={slug} />} locale={locale} messages={messages}>
        {children}
      </PageLockGate>
      <GestorStart
        open={!started}
        onStart={() => {
          bell.unlock()
          start()
        }}
        messages={messages}
      />
    </GestorFrame>
  )
}
