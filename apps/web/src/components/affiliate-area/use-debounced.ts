"use client"

// React
import { useEffect, useState } from "react"

/** A value that follows another once it has been still for `ms`: a search asks once a word is typed, not at each letter. */
export function useDebounced<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms)
    return () => clearTimeout(timer)
  }, [value, ms])

  return settled
}
