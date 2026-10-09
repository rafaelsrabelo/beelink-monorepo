"use client"

// React
import { useEffect, useState } from "react"

// Libs
import { CheckIcon, CopyIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"

export interface CustomDomainCopyButtonProps {
  value: string
  /** "Copiar"; "Copiado" once it did; "Valor selecionado" when the clipboard refused. */
  label: string
  doneLabel: string
  selectedLabel: string
  /** The element showing the value: it describes the button, and is selected when the clipboard refuses. */
  targetId: string
}

type CopyState = "idle" | "copied" | "selected"

/**
 * Copies one value of a DNS record — an address typed by hand into a provider's panel is where a
 * domain goes wrong — and says it did. A browser without the clipboard, or one that refuses it, gets
 * the value selected instead, to be copied by hand; either way the button says what happened, then
 * goes back to "Copiar".
 *
 * The shop window's `storefront-copy-button` does the same in the shop's colours, which the panel
 * does not wear: this one is the panel's button.
 */
export function CustomDomainCopyButton({ value, label, doneLabel, selectedLabel, targetId }: CustomDomainCopyButtonProps) {
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
    <Button type="button" variant="outline" size="sm" aria-describedby={targetId} onClick={copy}>
      {state === "copied" ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
      <span aria-live="polite">{state === "copied" ? doneLabel : state === "selected" ? selectedLabel : label}</span>
    </Button>
  )
}
