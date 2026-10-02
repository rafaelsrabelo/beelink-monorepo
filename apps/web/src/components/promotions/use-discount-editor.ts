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
  /** Null until the page has what to fill the form with: a new one's blanks, or the one read. */
  editing: Editing<V, I> | null
  open: (id: string | null, value: V) => void
  change: (value: V) => void
  refuse: (issues: I) => void
}

/**
 * The promotion's or the coupon's form as one piece of state: which record, what typed and what
 * refused. One object rather than three `useState`s that would have to be filled together when the
 * record arrives. `none` is the form with nothing to correct.
 */
export function useDiscountEditor<V, I>(none: I): DiscountEditor<V, I> {
  const [editing, setEditing] = useState<Editing<V, I> | null>(null)

  return {
    editing,
    open: (id, value) => setEditing({ id, value, issues: none }),
    // A field corrected stops saying it is wrong: the issues are of what was sent, not of what is typed.
    change: (value) => setEditing((current) => (current ? { ...current, value, issues: none } : current)),
    refuse: (issues) => setEditing((current) => (current ? { ...current, issues } : current)),
  }
}
