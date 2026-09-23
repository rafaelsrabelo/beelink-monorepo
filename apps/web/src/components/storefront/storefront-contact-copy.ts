// Types
import type { WebMessages } from "@/locales"

/** The refusals a visitor can meet sending a form, as sentences. */
export interface ContactCopy {
  LEAD_ANSWER_INVALID: string
  LEAD_FORM_NOT_FOUND: string
  RATE_LIMITED: string
  UNKNOWN: string
}

/**
 * Picked on the server, where the dictionary is, and handed to the client form as plain strings —
 * the whole dictionary would ride to every visitor for four sentences.
 */
export function contactCopyOf(web: WebMessages): ContactCopy {
  return {
    LEAD_ANSWER_INVALID: web.errors.LEAD_ANSWER_INVALID,
    LEAD_FORM_NOT_FOUND: web.errors.LEAD_FORM_NOT_FOUND,
    RATE_LIMITED: web.errors.RATE_LIMITED,
    UNKNOWN: web.errors.UNKNOWN,
  }
}
