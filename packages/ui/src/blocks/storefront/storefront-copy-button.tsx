"use client"

// React
import { useState } from "react"

// Libs
import { CheckIcon, CopyIcon } from "lucide-react"

export interface StorefrontCopyButtonProps {
  value: string
  /** "Copiar", and what it says once it did: "Copiado". */
  label: string
  doneLabel: string
  /** What is copied, for a screen reader: "Copiar código de rastreio". */
  describedBy?: string
}

/** Copies a value to the clipboard — a tracking code to paste in the carrier's search — and says it did. */
export function StorefrontCopyButton({ value, label, doneLabel, describedBy }: StorefrontCopyButtonProps) {
  const [copied, setCopied] = useState(false)

  return (
    <button
      type="button"
      aria-describedby={describedBy}
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => setCopied(true))
      }}
      className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-shop-line-strong bg-shop-background px-3 text-sm font-bold text-shop-on-background hover:bg-shop-fill"
    >
      {copied ? <CheckIcon aria-hidden="true" className="size-4" /> : <CopyIcon aria-hidden="true" className="size-4" />}
      <span aria-live="polite">{copied ? doneLabel : label}</span>
    </button>
  )
}
