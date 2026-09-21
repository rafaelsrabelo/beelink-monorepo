"use client"

// React
import { useEffect, useState } from "react"

/**
 * The value, a beat after it stopped changing.
 *
 * It exists for the address box and is worth its own file for what it protects: without it every
 * keystroke is a request, and the address search is a billed one. The API is rate-limited as well
 * — that limit protects the account, this one protects the shopkeeper's connection, and neither
 * stands in for the other.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [settled, setSettled] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs)

    // Cleared on every change, which is what makes this a debounce and not a delay: a value that
    // keeps changing never settles, and only the last one is ever asked about.
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return settled
}
