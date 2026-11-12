"use client"

// React
import { useState } from "react"

// Types
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { format } from "@harness-monorepo/ui/locales/index"

// App
import { affiliateErrorOf, commissionRateOf } from "@/lib/affiliate-form"
import { percentFrom } from "@/lib/discount-form"
import { AffiliateError } from "@/services/affiliates/affiliate-requests"

/** A record less one key. */
function without(record: Record<string, string>, key: string): Record<string, string> {
  const rest = { ...record }
  delete rest[key]
  return rest
}

/** What a row of the table's screen is, as the drafts read it: a product or a category. */
export interface RateDraftTarget {
  id: string
  name: string
}

export interface RateDraftsInput {
  /** Each own rate on the table, by product or by category. */
  saved: ReadonlyMap<string, number>
  /** Sends one rate — or null, to follow what is under it again. */
  save: (id: string, rateBps: number | null) => Promise<unknown>
  messages: UiMessages
}

/**
 * What is typed on a table's rates screen (IMPULSEIA-102, and by category since the user's review of
 * 12/11/2026), row by row: each draft, its refusal, and the save that sends one row on its own.
 */
export function useRateDrafts({ saved, save, messages }: RateDraftsInput) {
  const text = messages.affiliates
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [issues, setIssues] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<string | undefined>(undefined)
  const [busyId, setBusyId] = useState<string | null>(null)

  /** A row's own rate, what its field shows, and whether that differs from what is saved. */
  function draftOf(id: string): { rateBps: number | null; typed: string; changed: boolean } {
    const rateBps = saved.get(id) ?? null
    const shown = percentFrom(rateBps)
    const typed = drafts[id] ?? shown
    return { rateBps, typed, changed: typed.trim() !== shown }
  }

  function type(id: string, typed: string) {
    setIssues((current) => without(current, id))
    setStatus(undefined)
    setDrafts((current) => ({ ...current, [id]: typed }))
  }

  async function send(target: RateDraftTarget, rateBps: number | null) {
    setBusyId(target.id)
    try {
      await save(target.id, rateBps)
      setDrafts((current) => without(current, target.id))
      setIssues((current) => without(current, target.id))
      setStatus(format(text.table.saved, { name: target.name }))
    } catch (error) {
      setIssues((current) => ({ ...current, [target.id]: affiliateErrorOf(error instanceof AffiliateError ? error.errorCode : "UNKNOWN", text.errors) }))
    } finally {
      setBusyId(null)
    }
  }

  /** The row's draft as the wire takes it: empty follows what is under it, so it drops the row's own rate. */
  function saveRow(target: RateDraftTarget) {
    const rateBps = commissionRateOf(draftOf(target.id).typed)
    if (rateBps === undefined) return setIssues((current) => ({ ...current, [target.id]: text.issues.rate }))
    void send(target, rateBps)
  }

  return { draftOf, type, saveRow, resetRow: (target: RateDraftTarget) => void send(target, null), issues, status, busyId }
}
