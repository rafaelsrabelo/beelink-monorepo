"use client"

// React
import { useState } from "react"

/** The form on screen: which record it edits — null is a new one — what it holds, and the fields to correct. */
interface Editing<V, I> {
  id: string | null
  value: V
  issues: I
}

export interface DiscountEditor<V, I> {
  /** Null while the form is closed. */
  editing: Editing<V, I> | null
  open: (id: string | null, value: V) => void
  change: (value: V) => void
  refuse: (issues: I) => void
  close: () => void
}

/**
 * The promotions' and the coupons' form as one piece of state: open or closed, on which record, with
 * what typed and what refused. One object rather than four `useState`s that would have to be reset
 * together every time the form opens, closes or changes record. `none` is the form with nothing to
 * correct.
 */
export function useDiscountEditor<V, I>(none: I): DiscountEditor<V, I> {
  const [editing, setEditing] = useState<Editing<V, I> | null>(null)

  return {
    editing,
    open: (id, value) => setEditing({ id, value, issues: none }),
    // A field corrected stops saying it is wrong: the issues are of what was sent, not of what is typed.
    change: (value) => setEditing((current) => (current ? { ...current, value, issues: none } : current)),
    refuse: (issues) => setEditing((current) => (current ? { ...current, issues } : current)),
    close: () => setEditing(null),
  }
}
