"use client"

// React
import { useState } from "react"

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
import { Button, buttonVariants } from "@harness-monorepo/ui/components/button"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface CustomDomainActionsProps {
  /** The saved domain's host. */
  host: string
  /** The page's address at the platform, with no scheme: where the page opens again once the domain is removed. */
  address: string
  /** Asks for a check, now. Left out where this deployment can run none: the domain can still be removed there. */
  onCheck?: () => void
  checking?: boolean
  /** What a check that just came back found, in words, to be read out. */
  checkResult?: string
  /** Why the last check did not go through, in words. */
  checkError?: string
  onRemove: () => void
  removing?: boolean
  /** Why the last removal did not go through, in words. */
  removeError?: string
  messages?: UiMessages
}

/** The look of a held button: the primitive dims `:disabled`, which a button kept focusable is not. */
const HELD = "aria-disabled:opacity-50"

/**
 * What can be done with a saved domain (BEELINK-285): check it again — DNS changes on its own time,
 * and the shopkeeper who has just saved the records at their provider is the one who knows to ask —
 * and remove it, after a question that says what removing does and how long it takes to show.
 *
 * Both buttons are held while either runs, and stay focusable meanwhile: a button that turns
 * disabled under the focus drops it to the page's start, and whoever pressed "Verificar de novo"
 * by the keyboard would be read the result from nowhere near it.
 */
export function CustomDomainActions({ host, address, onCheck, checking = false, checkResult, checkError, onRemove, removing = false, removeError, messages = defaultMessages }: CustomDomainActionsProps) {
  const text = messages.customDomain
  const [confirming, setConfirming] = useState(false)
  const busy = checking || removing
  const error = busy ? undefined : (checkError ?? removeError)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {onCheck ? (
          <Button type="button" variant="outline" disabled={busy} focusableWhenDisabled aria-busy={checking || undefined} onClick={onCheck} className={HELD}>
            {checking ? text.checking : text.check}
          </Button>
        ) : null}
        <Button type="button" variant="outline" disabled={busy} focusableWhenDisabled onClick={() => setConfirming(true)} className={HELD}>
          {text.remove}
        </Button>
      </div>
      {/* Always there, so what comes of a check is read out when it arrives. */}
      <p role="status" className="text-sm empty:hidden">
        {busy || error ? null : checkResult}
      </p>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      <AlertDialog open={confirming} onOpenChange={(next: boolean) => setConfirming(next)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="break-words">{format(text.removeTitle, { domain: host })}</AlertDialogTitle>
            <AlertDialogDescription className="break-words">{format(text.removeBody, { domain: host, address })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {/* Keeping it keeps the default focus: an Enter must not take the page off its domain. */}
            <AlertDialogCancel>{text.removeCancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirming(false)
                onRemove()
              }}
              className={cn(buttonVariants({ variant: "destructive" }))}
            >
              {text.removeConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
