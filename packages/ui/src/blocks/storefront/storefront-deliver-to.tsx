"use client"

// React
import { useEffect, useId, useRef, useState } from "react"

// Libs
import { MapPinIcon } from "lucide-react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface StorefrontDeliverToProps {
  /** The visitor's CEP, eight digits, or null before they gave one. */
  cep: string | null
  /** Keeps the CEP typed. Absent, the block is drawn and does nothing: design mode's preview. */
  onSave?: (cep: string) => void
  messages?: UiMessages
}

/** "01310930" as a person writes it: "01310-930". */
export function cepAsWritten(digits: string): string {
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5, 8)}` : digits
}

/**
 * "Entregar em" over the visitor's CEP, or an invitation to give one, between the logo and the search.
 * There is no shipping quote yet, so it keeps the CEP and promises nothing: no price, no time, no town.
 *
 * A disclosure drawn under its button and not a portaled popover: it stays inside the header, in the
 * shop's colours, which a popup moved to the page's end would leave behind. Escape and a press
 * elsewhere close it, and the focus returns to the button.
 */
export function StorefrontDeliverTo({ cep, onSave, messages = defaultMessages }: StorefrontDeliverToProps) {
  const text = messages.storefront.deliverTo
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState("")
  const panelId = useId()
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const digits = typed.replace(/\D/g, "").slice(0, 8)

  useEffect(() => {
    if (!open) return
    const close = (focusBack: boolean) => {
      setOpen(false)
      if (focusBack) button.current?.focus()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(true)
    }
    const onPress = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) close(false)
    }
    document.addEventListener("keydown", onKey)
    document.addEventListener("pointerdown", onPress)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("pointerdown", onPress)
    }
  }, [open])

  const lines = (
    <>
      <MapPinIcon aria-hidden="true" className="size-5 shrink-0" />
      <span className="flex flex-col items-start leading-tight">
        <span className="text-xs opacity-85">{text.label}</span>
        <span className="text-sm font-bold">{cep ? cepAsWritten(cep) : text.ask}</span>
      </span>
    </>
  )

  if (!onSave) return <span className="flex items-center gap-1.5">{lines}</span>

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setTyped(cep ?? "")
          setOpen((was) => !was)
        }}
        className="flex items-center gap-1.5 rounded-md px-1 py-0.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
      >
        {lines}
      </button>

      {open ? (
        <form
          id={panelId}
          aria-label={text.label}
          className="absolute top-full left-0 z-40 mt-2 flex w-64 flex-col gap-2 rounded-xl border border-shop-line bg-shop-background p-3 text-shop-on-background shadow-lg"
          onSubmit={(event) => {
            event.preventDefault()
            if (digits.length !== 8) return
            onSave(digits)
            setOpen(false)
            button.current?.focus()
          }}
        >
          <label htmlFor={`${panelId}-cep`} className="text-sm font-semibold">
            {text.field}
          </label>
          <input
            id={`${panelId}-cep`}
            // Opened by a press on the button: the caret goes where the next keystroke belongs.
            autoFocus
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="00000-000"
            value={cepAsWritten(digits)}
            onChange={(event) => setTyped(event.target.value)}
            aria-describedby={`${panelId}-note`}
            className="h-10 rounded-[10px] border border-shop-line-strong bg-shop-background px-3 text-base"
          />
          <p id={`${panelId}-note`} className="text-xs text-shop-muted">
            {text.note}
          </p>
          <button
            type="submit"
            disabled={digits.length !== 8}
            className={cn("h-10 rounded-full bg-shop-primary text-sm font-semibold text-shop-on-primary", digits.length !== 8 && "opacity-50")}
          >
            {text.save}
          </button>
        </form>
      ) : null}
    </div>
  )
}
