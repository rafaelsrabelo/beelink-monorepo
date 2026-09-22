"use client"

// React
import { useEffect, useId, useRef, useState } from "react"

// Libs
import { SearchIcon } from "lucide-react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface AdminSearchProps {
  value?: string
  onValueChange?: (value: string) => void
  onSubmit?: (term: string) => void
  messages?: UiMessages
}

/**
 * The search box in the middle of the dark header.
 *
 * It is a `<form role="search">` and not a bare input: pressing Enter in a lone text field does
 * nothing, and a search a keyboard cannot submit is a decoration. The form also gives the field its
 * accessible name without a visible label, which the design has no room for.
 *
 * The ⌘K hint is decided after mount, never during render. `navigator` does not exist on the
 * server, so reading it while rendering would hand the browser different HTML than the server sent;
 * and the symbol matters — ⌘ on Windows is simply wrong. The machine-readable form is
 * `aria-keyshortcuts`, whose syntax is ARIA's and is never translated, so the visible hint is
 * `aria-hidden` and the two say the same thing in their own languages.
 */
export function AdminSearch({
  value,
  onValueChange,
  onSubmit,
  messages = defaultMessages,
}: AdminSearchProps) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [apple, setApple] = useState(false)
  const text = messages.shell

  useEffect(() => {
    setApple(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent))
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey)) return
      event.preventDefault()
      inputRef.current?.focus()
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <form
      role="search"
      className="relative w-full"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit?.(inputRef.current?.value ?? "")
      }}
    >
      <label className="sr-only" htmlFor={id}>
        {text.searchLabel}
      </label>
      <SearchIcon
        aria-hidden="true"
        className="text-header-foreground/60 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
      />
      <input
        ref={inputRef}
        id={id}
        type="search"
        autoComplete="off"
        placeholder={text.searchPlaceholder}
        aria-keyshortcuts="Control+K Meta+K"
        value={value}
        onChange={(event) => onValueChange?.(event.target.value)}
        className="bg-header-field text-header-foreground placeholder:text-header-foreground/60 border-header-border hover:bg-header-field-hover focus-visible:ring-header-foreground/70 h-8 w-full rounded-lg border pr-16 pl-9 text-sm outline-none focus-visible:ring-2"
      />
      <kbd
        aria-hidden="true"
        className="text-header-foreground/60 border-header-border pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 rounded border px-1.5 py-[3px] text-[11px] font-medium sm:block"
      >
        {apple ? text.searchShortcutApple : text.searchShortcut}
      </kbd>
    </form>
  )
}
