"use client"

// React
import { useId, useRef, useState } from "react"

// Libs
import { CheckIcon, ExternalLinkIcon } from "lucide-react"

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
import type { MetaConversionsView, MetaTestEventView } from "@harness-monorepo/ui/lib/integrations"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { MetaTestEventForm } from "./meta-test-event-form"
import { MetaTokenForm } from "./meta-token-form"

export interface MetaConversionsCardProps {
  view: MetaConversionsView
  /** Meta's Events Manager, where the token is generated. The address is the screen's to know. */
  eventsManagerHref: string
  /** Saves the token pasted, or replaces the one saved. It is handed over once and kept nowhere here. */
  onSaveToken: (accessToken: string) => void
  savingToken?: boolean
  /** Why the API refused the last token, in words. */
  tokenError?: string
  /** The replacement was left without sending: a refusal said in it has nothing left to be about. */
  onReplaceCancel?: () => void
  onRemoveToken: () => void
  removingToken?: boolean
  removeError?: string
  onTest: (testEventCode: string) => void
  testing?: boolean
  testError?: string
  testResult?: MetaTestEventView | null
  messages?: UiMessages
}

const STEPS = ["open", "pick", "settings", "generate", "paste"] as const

/**
 * The purchases told to Meta from the server, in the pixel's page (BEELINK-274): whether a token is
 * saved — never the token — what Meta refused of it, the field one is pasted into, where it is
 * generated at Meta, and the test event. Under the pixel's own card, and only for a shop with an ID
 * saved: a token is one pixel's.
 *
 * Where this deployment has nowhere to seal a token, the card says so and offers no field.
 *
 * Replacing a token shows the same field again, and it stays through a refusal. The card cannot
 * tell one saved token from the next — it never sees one — so the screen gives it a new `key` when
 * a token is saved, which is what closes the replacement.
 */
export function MetaConversionsCard({
  view,
  eventsManagerHref,
  onSaveToken,
  savingToken = false,
  tokenError,
  onReplaceCancel,
  onRemoveToken,
  removingToken = false,
  removeError,
  onTest,
  testing = false,
  testError,
  testResult = null,
  messages = defaultMessages,
}: MetaConversionsCardProps) {
  const text = messages.integrations.metaConversions
  const id = useId()
  const body = useRef<HTMLDivElement>(null)
  const [confirming, setConfirming] = useState(false)
  const [replacing, setReplacing] = useState(false)
  const has = view.token !== "NONE"
  const rejected = view.token === "REJECTED"
  const asking = view.available && (!has || replacing)
  useFocusOnSwap(asking ? "token" : "saved", body)
  const badge = !view.available ? "UNAVAILABLE" : view.token

  function leaveReplacement() {
    setReplacing(false)
    onReplaceCancel?.()
  }

  return (
    <section aria-labelledby={`${id}-title`} className="bg-shell-surface border-shell-border flex flex-col gap-4 rounded-xl border p-4 shadow-xs sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id={`${id}-title`} className="font-semibold">
          {text.title}
        </h2>
        <Badge variant={badge === "SET" ? "success" : badge === "REJECTED" ? "destructive" : "outline"}>
          {badge === "SET" ? <CheckIcon aria-hidden="true" /> : null}
          {text.badges[badge]}
        </Badge>
      </div>
      <p className="text-muted-foreground text-sm">{text.lead}</p>

      {!view.available ? (
        <p className="bg-muted rounded-lg px-3 py-3 text-sm">{text.unavailable}</p>
      ) : (
        <>
          {rejected ? (
            <p role="alert" className="border-destructive/40 text-destructive rounded-lg border px-3 py-3 text-sm">
              {text.refusals[view.refusal ?? "TOKEN_REJECTED"]}
            </p>
          ) : null}

          <div ref={body} className="flex flex-col gap-4">
            {has && !rejected ? <p className="text-sm">{text.tokenSet}</p> : null}
            {asking ? (
              <MetaTokenForm
                onSubmit={onSaveToken}
                pending={savingToken}
                error={tokenError}
                label={has ? text.replaceLabel : undefined}
                submitLabel={has ? text.replaceSubmit : undefined}
                onCancel={has ? leaveReplacement : undefined}
                messages={messages}
              />
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" variant={rejected ? "default" : "outline"} disabled={removingToken || savingToken} onClick={() => setReplacing(true)}>
                  {text.replaceToken}
                </Button>
                <Button type="button" variant="outline" disabled={removingToken || savingToken} onClick={() => setConfirming(true)}>
                  {text.remove}
                </Button>
              </div>
            )}
            {removeError ? (
              <p role="alert" className="text-destructive text-sm">
                {removeError}
              </p>
            ) : null}
          </div>

          <div className="bg-muted flex flex-col gap-2 rounded-lg px-3 py-3">
            <h3 className="text-sm font-medium">{text.guide.title}</h3>
            <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm">
              {STEPS.map((step) => (
                <li key={step}>{text.guide.steps[step]}</li>
              ))}
            </ol>
            <a href={eventsManagerHref} target="_blank" rel="noopener noreferrer" className="text-foreground inline-flex w-fit items-center gap-1 text-sm underline underline-offset-4">
              {messages.integrations.metaPixel.guide.openLink} <span className="sr-only">{messages.integrations.metaPixel.guide.newTab}</span>
              <ExternalLinkIcon aria-hidden="true" className="size-3.5" />
            </a>
          </div>

          {has ? <MetaTestEventForm onSubmit={onTest} pending={testing} error={testError} result={testResult} messages={messages} /> : null}
        </>
      )}

      <AlertDialog open={confirming} onOpenChange={(next: boolean) => setConfirming(next)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{text.removeTitle}</AlertDialogTitle>
            <AlertDialogDescription>{text.removeBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {/* Keeping it keeps the default focus: an Enter must not take the shop's token away. */}
            <AlertDialogCancel>{text.removeCancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirming(false)
                onRemoveToken()
              }}
              className={cn(buttonVariants({ variant: "destructive" }))}
            >
              {text.removeConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
