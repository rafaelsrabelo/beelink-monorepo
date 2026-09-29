"use client"

// React
import { useEffect, useState } from "react"

// Libs
import { CheckIcon, CopyIcon } from "lucide-react"

export interface StorefrontCopyButtonProps {
  value: string
  /** "Copiar"; "Copiado" once it did; "Código selecionado" when the clipboard refused. */
  label: string
  doneLabel: string
  selectedLabel: string
  /** The element showing the value: it describes the button, and is selected when the clipboard refuses. */
  targetId: string
}

type CopyState = "idle" | "copied" | "selected"

/**
 * Copies a value to the clipboard — a tracking code to paste in the carrier's search — and says it
 * did. A browser without the clipboard, or one that refuses it, gets the code selected instead, so
 * the shopper copies it by hand; either way the button says what happened, then goes back to "Copiar".
 */
export function StorefrontCopyButton({ value, label, doneLabel, selectedLabel, targetId }: StorefrontCopyButtonProps) {
  const [state, setState] = useState<CopyState>("idle")

  useEffect(() => {
    if (state === "idle") return
    const timer = setTimeout(() => setState("idle"), 4000)
    return () => clearTimeout(timer)
  }, [state])

  function select() {
    const target = document.getElementById(targetId)
    const selection = window.getSelection()
    if (target && selection) selection.selectAllChildren(target)
    setState("selected")
  }

  function copy() {
    if (!navigator.clipboard) return select()
    navigator.clipboard.writeText(value).then(() => setState("copied"), select)
  }

  return (
    <button
      type="button"
      aria-describedby={targetId}
      onClick={copy}
      className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-shop-line-strong bg-shop-background px-3 text-sm font-bold text-shop-on-background hover:bg-shop-fill"
    >
      {state === "copied" ? <CheckIcon aria-hidden="true" className="size-4" /> : <CopyIcon aria-hidden="true" className="size-4" />}
      <span aria-live="polite">{state === "copied" ? doneLabel : state === "selected" ? selectedLabel : label}</span>
    </button>
  )
}
