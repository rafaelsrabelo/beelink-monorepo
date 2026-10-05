"use client"

// React
import { useId, useRef, useState } from "react"

// Libs
import { CreditCardIcon, ExternalLinkIcon, TriangleAlertIcon } from "lucide-react"

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
import { useFocusOnSwap } from "@harness-monorepo/ui/hooks/use-focus-on-swap"
import type { AsaasCardView } from "@harness-monorepo/ui/lib/integrations"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AsaasAccountFacts } from "./asaas-account-facts"
import { AsaasKeyForm } from "./asaas-key-form"

export interface AsaasCardProps {
  view: AsaasCardView
  /** Connects with the key typed, or replaces the one connected. The key is handed over once and kept by no prop. */
  onConnect: (apiKey: string) => void
  /** Asaas is being asked about the key, which takes seconds. */
  connecting?: boolean
  /** Why the last key was refused, in words. */
  connectError?: string
  /** The replacement was left without sending: a refusal said in it has nothing left to be about. */
  onReplaceCancel?: () => void
  onDisconnect: () => void
  disconnecting?: boolean
  /** Why the last disconnect did not go through, in words. */
  disconnectError?: string
  /** `h1` where the card is its page — Asaas's own — so the page is not titled twice. */
  headingAs?: "h1" | "h2"
  messages?: UiMessages
}

/**
 * The shop's Asaas account in the panel's Integrations (BEELINK-203): what connecting gives, the
 * field its API key is pasted into, whose account is connected and where its payment notices stand,
 * and the warning when Asaas stopped accepting the key.
 *
 * Replacing the key shows the same field again. That form belongs to the connection it was opened
 * on: the moment another connection takes its place the form is closed and what was typed in it is
 * gone, with nothing for the screen to reset.
 */
export function AsaasCard({ view, onConnect, connecting = false, connectError, onReplaceCancel, onDisconnect, disconnecting = false, disconnectError, headingAs: Heading = "h2", messages = defaultMessages }: AsaasCardProps) {
  const text = messages.integrations.asaas
  const id = useId()
  const body = useRef<HTMLDivElement>(null)
  const [confirming, setConfirming] = useState(false)
  const [replacingAt, setReplacingAt] = useState<string | null>(null)
  const replacing = view.status === "CONNECTED" && replacingAt !== null && replacingAt === view.connectedAt
  const keyed = view.status !== "CONNECTED" || replacing
  const badge = { DISCONNECTED: text.disconnectedBadge, CONNECTED: text.connected, NEEDS_RECONNECT: text.needsReconnectBadge }[view.status]
  useFocusOnSwap(keyed ? "key" : "account", body)

  function leaveReplacement() {
    setReplacingAt(null)
    onReplaceCancel?.()
  }

  return (
    <section aria-labelledby={`${id}-title`} className="bg-shell-surface border-shell-border flex flex-col gap-4 rounded-xl border p-4 shadow-xs sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="bg-muted flex size-10 items-center justify-center rounded-lg">
          <CreditCardIcon aria-hidden="true" className="size-5" />
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
      ) : (
        <div ref={body} className="flex flex-col gap-4">
          {view.status === "NEEDS_RECONNECT" ? (
            <div role="alert" className="border-destructive/30 bg-destructive/10 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm">
              <TriangleAlertIcon aria-hidden="true" className="text-destructive mt-0.5 size-4 shrink-0" />
              <span>{text.needsReconnect}</span>
            </div>
          ) : null}
          {view.sandbox ? <p className="bg-muted rounded-lg px-3 py-2 text-sm">{text.sandboxNote}</p> : null}
          {view.status !== "DISCONNECTED" ? <AsaasAccountFacts view={view} messages={messages} /> : null}

          {keyed ? (
            <AsaasKeyForm
              onSubmit={onConnect}
              pending={connecting}
              error={connectError}
              label={replacing ? text.replaceLabel : undefined}
              submitLabel={replacing ? text.replaceSubmit : view.status === "NEEDS_RECONNECT" ? text.reconnectSubmit : undefined}
              onCancel={replacing ? leaveReplacement : undefined}
              messages={messages}
            />
          ) : null}

          {view.status === "DISCONNECTED" ? (
            <p className="text-muted-foreground text-sm">
              {text.noAccount}{" "}
              <a href={view.signUpHref} target="_blank" rel="noopener noreferrer" className="text-foreground inline-flex items-center gap-1 underline underline-offset-4">
                {text.signUp} <span className="sr-only">{text.newTab}</span>
                <ExternalLinkIcon aria-hidden="true" className="size-3.5" />
              </a>
            </p>
          ) : replacing ? null : (
            <div className="flex flex-wrap items-center gap-3">
              {view.status === "CONNECTED" ? (
                <Button type="button" variant="outline" disabled={disconnecting} onClick={() => setReplacingAt(view.connectedAt)}>
                  {text.replaceKey}
                </Button>
              ) : null}
              <Button type="button" variant="outline" disabled={disconnecting || connecting} onClick={() => setConfirming(true)}>
                {text.disconnect}
              </Button>
            </div>
          )}
          {disconnectError ? (
            <p role="alert" className="text-destructive text-sm">
              {disconnectError}
            </p>
          ) : null}
        </div>
      )}

      <AlertDialog open={confirming} onOpenChange={(next: boolean) => setConfirming(next)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{text.disconnectTitle}</AlertDialogTitle>
            <AlertDialogDescription>{text.disconnectBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {/* Keeping it keeps the default focus: an Enter must not stop the shop from being paid. */}
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
