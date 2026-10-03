"use client"

// React
import { useId, useState } from "react"

// Libs
import { TriangleAlertIcon, TruckIcon } from "lucide-react"

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
import { Badge } from "@harness-monorepo/ui/components/badge"
import { Button, buttonVariants } from "@harness-monorepo/ui/components/button"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import type { MelhorEnvioCardView } from "@harness-monorepo/ui/lib/integrations"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface MelhorEnvioCardProps {
  view: MelhorEnvioCardView
  /** Where "Conectar" goes: the web's route that sends the browser to Melhor Envio. */
  connectHref: string
  onDisconnect: () => void
  disconnecting?: boolean
  /** Why the last disconnect did not go through, in words. */
  disconnectError?: string
  /** `h1` where the card is its page — Melhor Envio's own — so the page is not titled twice. */
  headingAs?: "h1" | "h2"
  messages?: UiMessages
}

/**
 * The shop's Melhor Envio account in the panel's Integrations (BEELINK-183): what connecting gives,
 * the way to connect, whose account is connected and what its wallet holds, and the warning when
 * Melhor Envio stopped accepting the connection.
 *
 * "Conectar" is a plain anchor, never the app's link: a router link prefetches its address, and this
 * one begins an authorization at Melhor Envio the moment it is fetched.
 */
export function MelhorEnvioCard({ view, connectHref, onDisconnect, disconnecting = false, disconnectError, headingAs: Heading = "h2", messages = defaultMessages }: MelhorEnvioCardProps) {
  const text = messages.integrations.melhorEnvio
  const id = useId()
  const [confirming, setConfirming] = useState(false)
  const badge = { DISCONNECTED: text.disconnectedBadge, CONNECTED: text.connected, NEEDS_RECONNECT: text.needsReconnectBadge }[view.status]

  return (
    <section aria-labelledby={`${id}-title`} className="bg-shell-surface border-shell-border flex flex-col gap-4 rounded-xl border p-4 shadow-xs sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="bg-muted flex size-10 items-center justify-center rounded-lg">
          <TruckIcon aria-hidden="true" className="size-5" />
        </span>
        <Heading id={`${id}-title`} className={Heading === "h1" ? "text-2xl font-semibold" : "font-semibold"}>
          {text.title}
        </Heading>
        {view.available ? <Badge variant={view.status === "CONNECTED" ? "default" : view.status === "NEEDS_RECONNECT" ? "destructive" : "outline"}>{badge}</Badge> : null}
        {view.available && view.sandbox ? (
          <Badge variant="secondary" title={text.sandboxHint}>
            {text.sandbox}
          </Badge>
        ) : null}
      </div>
      <p className="text-muted-foreground text-sm">{text.lead}</p>

      {!view.available ? (
        <p className="bg-muted rounded-lg px-3 py-2 text-sm">{text.unavailable}</p>
      ) : view.status === "DISCONNECTED" ? (
        <a href={connectHref} className={cn(buttonVariants(), "self-start")}>
          {text.connect}
        </a>
      ) : (
        <>
          {view.status === "NEEDS_RECONNECT" ? (
            <div role="alert" className="border-destructive/30 bg-destructive/10 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm">
              <TriangleAlertIcon aria-hidden="true" className="text-destructive mt-0.5 size-4 shrink-0" />
              <span>{text.needsReconnect}</span>
            </div>
          ) : null}

          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <dt className="text-muted-foreground text-sm">{text.account}</dt>
              <dd className="text-sm font-medium">
                {view.account?.name}
                {view.account?.email ? <span className="text-muted-foreground block font-normal">{view.account.email}</span> : null}
              </dd>
            </div>
            {view.status === "CONNECTED" ? (
              <div className="flex flex-col gap-1">
                <dt className="text-muted-foreground text-sm">{text.balance}</dt>
                <dd aria-busy={view.wallet.state === "loading" || undefined}>
                  {view.wallet.state === "loading" ? (
                    <Skeleton className="h-6 w-28" />
                  ) : view.wallet.state === "failed" ? (
                    <span className="text-sm">{text.balanceFailed}</span>
                  ) : (
                    <span className="text-lg font-semibold tabular-nums">{view.wallet.balance}</span>
                  )}
                  <span className="text-muted-foreground block text-xs">{text.balanceHint}</span>
                </dd>
              </div>
            ) : null}
          </dl>

          <div className="flex flex-wrap items-center gap-3">
            {view.status === "NEEDS_RECONNECT" ? (
              <a href={connectHref} className={buttonVariants()}>
                {text.reconnect}
              </a>
            ) : null}
            <Button type="button" variant="outline" disabled={disconnecting} onClick={() => setConfirming(true)}>
              {text.disconnect}
            </Button>
          </div>
          {disconnectError ? (
            <p role="alert" className="text-destructive text-sm">
              {disconnectError}
            </p>
          ) : null}
        </>
      )}

      <AlertDialog open={confirming} onOpenChange={(next: boolean) => setConfirming(next)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{text.disconnectTitle}</AlertDialogTitle>
            <AlertDialogDescription>{text.disconnectBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {/* Keeping it keeps the default focus: an Enter must not cut the shop off its carriers. */}
            <AlertDialogCancel>{text.disconnectCancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirming(false)
                onDisconnect()
              }}
              className={cn(buttonVariants({ variant: "destructive" }))}
            >
              {text.disconnectConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
