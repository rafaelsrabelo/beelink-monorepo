"use client"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface StorefrontPrintButtonProps {
  messages?: UiMessages
}

/** The receipt's "Imprimir": the browser's own dialog, which also saves it as a PDF. Never on the paper. */
export function StorefrontPrintButton({ messages = defaultMessages }: StorefrontPrintButtonProps) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex h-10 items-center rounded-full bg-shop-primary px-5 text-sm font-bold text-shop-on-primary hover:opacity-90 print:hidden"
    >
      {messages.storefront.receiptPrint}
    </button>
  )
}
