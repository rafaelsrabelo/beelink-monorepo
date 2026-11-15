"use client"

// UI
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@harness-monorepo/ui/components/dialog"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface StorefrontAffiliateTermsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The shop's own terms; null when it wrote none. */
  terms: string | null
  messages?: UiMessages
}

/** The programme's terms over the page (plan 2026-11-14), read before ticking that they were. */
export function StorefrontAffiliateTermsDialog({ open, onOpenChange, terms, messages = defaultMessages }: StorefrontAffiliateTermsDialogProps) {
  const text = messages.affiliateJoin.terms

  return (
    <Dialog open={open} onOpenChange={(next: boolean) => onOpenChange(next)}>
      <DialogContent closeLabel={text.close} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{text.title}</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground max-h-[60vh] overflow-y-auto text-sm whitespace-pre-line">{terms ?? text.none}</p>
      </DialogContent>
    </Dialog>
  )
}
