"use client"

// React
import { useEffect, useRef, type RefObject } from "react"

/**
 * The value of the latest render, for code that runs after an `await`: a callback captured when an
 * upload started carries the props of that render, and calling it a second later would hand back
 * what the owner has typed over since.
 */
export function useLatest<T>(value: T): RefObject<T> {
  const latest = useRef(value)
  useEffect(() => {
    latest.current = value
  })
  return latest
}
