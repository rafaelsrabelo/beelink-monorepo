"use client"

// React
import { useEffect, useState } from "react"

/** How long "Copiado!" stays before the button says "Copiar" again. */
const SHOWN_MS = 2000

/**
 * Copies a link and remembers, for a moment, which one was copied — the area's buttons say so.
 * A clipboard the browser refuses (no permission, an old browser) leaves the button as it was.
 */
export function useCopied(): { copiedKey: string | null; copy: (key: string, text: string) => void } {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  useEffect(() => {
    if (!copiedKey) return
    const timer = setTimeout(() => setCopiedKey(null), SHOWN_MS)
    return () => clearTimeout(timer)
  }, [copiedKey])

  function copy(key: string, text: string) {
    void navigator.clipboard
      ?.writeText(text)
      .then(() => setCopiedKey(key))
      .catch(() => undefined)
  }

  return { copiedKey, copy }
}
