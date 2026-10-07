"use client"

// React
import { useId, useRef, useState } from "react"

// Libs
import { CheckIcon } from "lucide-react"

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
import type { MetaPixelCardView } from "@harness-monorepo/ui/lib/integrations"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { IntegrationLogo } from "./integration-logo"
import { MetaPixelIdForm } from "./meta-pixel-id-form"

export interface MetaPixelCardProps {
  view: MetaPixelCardView
  /** Meta's own mark, as a file the app serves. */
  logoSrc: string
  /** Saves the ID typed, or replaces the one saved. It arrives as the API takes it: digits only. */
  onConnect: (pixelId: string) => void
  connecting?: boolean
  /** Why the API refused the last ID, in words. */
  connectError?: string
  /** The replacement was left without sending: a refusal said in it has nothing left to be about. */
  onReplaceCancel?: () => void
  onDisconnect: () => void
  disconnecting?: boolean
  /** Why the last disconnect did not go through, in words. */
  disconnectError?: string
  /** `h1` where the card is its page — the pixel's own — so the page is not titled twice. */
  headingAs?: "h1" | "h2"
  messages?: UiMessages
}

/**
 * The shop's Meta Pixel in the panel's Integrations (BEELINK-270): what a pixel is for, the field
 * its ID is pasted into, and — once one is saved — which ID it is, with the ways to change it or to
 * take it away. Connected means an ID is saved: nothing is asked of Meta, so nothing here says more.
 *
 * Changing the ID shows the same field again. That form belongs to the connection it was opened on:
 * the moment another ID takes its place the form is closed, with nothing for the screen to reset.
 */
export function MetaPixelCard({ view, logoSrc, onConnect, connecting = false, connectError, onReplaceCancel, onDisconnect, disconnecting = false, disconnectError, headingAs: Heading = "h2", messages = defaultMessages }: MetaPixelCardProps) {
  const text = messages.integrations.metaPixel
  const id = useId()
  const body = useRef<HTMLDivElement>(null)
  const [confirming, setConfirming] = useState(false)
  const [replacingAt, setReplacingAt] = useState<string | null>(null)
  const connected = view.pixelId !== null
  const replacing = connected && replacingAt !== null && replacingAt === view.connectedAt
  const asking = !connected || replacing
  useFocusOnSwap(asking ? "id" : "saved", body)

  function leaveReplacement() {
    setReplacingAt(null)
    onReplaceCancel?.()
  }

  return (
    <section aria-labelledby={`${id}-title`} className="bg-shell-surface border-shell-border flex flex-col gap-4 rounded-xl border p-4 shadow-xs sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <IntegrationLogo src={logoSrc} />
        <Heading id={`${id}-title`} className={Heading === "h1" ? "text-2xl font-semibold" : "font-semibold"}>
          {text.title}
        </Heading>
        <Badge variant={connected ? "success" : "outline"}>
          {connected ? <CheckIcon aria-hidden="true" /> : null}
          {connected ? text.connected : text.disconnectedBadge}
        </Badge>
      </div>
      <p className="text-muted-foreground text-sm">{text.lead}</p>

      <div ref={body} className="flex flex-col gap-4">
        {connected ? (
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <dt className="text-muted-foreground text-sm">{text.idLabel}</dt>
              <dd className="text-sm font-medium break-all tabular-nums">{view.pixelId}</dd>
            </div>
            {view.savedAt ? (
              <div className="flex flex-col gap-1">
                <dt className="text-muted-foreground text-sm">{text.savedAt}</dt>
                <dd className="text-sm font-medium tabular-nums">{view.savedAt}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        {asking ? (
          <MetaPixelIdForm
            onSubmit={onConnect}
            pending={connecting}
            error={connectError}
            label={replacing ? text.replaceLabel : undefined}
            submitLabel={replacing ? text.replaceSubmit : undefined}
            onCancel={replacing ? leaveReplacement : undefined}
            messages={messages}
          />
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" disabled={disconnecting} onClick={() => setReplacingAt(view.connectedAt)}>
              {text.replaceId}
            </Button>
            <Button type="button" variant="outline" disabled={disconnecting} onClick={() => setConfirming(true)}>
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

      <AlertDialog open={confirming} onOpenChange={(next: boolean) => setConfirming(next)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{text.disconnectTitle}</AlertDialogTitle>
            <AlertDialogDescription>{text.disconnectBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {/* Keeping it keeps the default focus: an Enter must not take the shop's pixel away. */}
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
