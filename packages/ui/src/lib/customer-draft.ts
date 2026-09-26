/**
 * A customer as the panel types them — registered on a new order, or corrected on their record —
 * and the checks the screen runs before the API does, with the API's own limits.
 */

// Locales
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Lib
import type { OrderCustomerDraft } from "./order-form"

/** In the order a person writes an address, which is the order the fields are drawn in. */
export const CUSTOMER_ADDRESS_FIELDS = ["zipCode", "street", "number", "complement", "neighborhood", "city", "state"] as const

export type CustomerAddressField = (typeof CUSTOMER_ADDRESS_FIELDS)[number]

export type CustomerDraftIssues = Partial<Record<"name" | "phone" | "zipCode" | "state", string>>

export interface CustomerDraftRules {
  /**
   * Whether a blank phone is refused. It is for a customer being registered, who is known by it; a
   * record that never had one may keep none, and one that had one may not be emptied — the API
   * refuses that, so the screen says it first.
   */
  phoneRequired?: boolean
}

/** What is wrong with the draft, in the words of the new-order form, keyed by the field to point at. */
export function customerDraftIssuesOf(
  draft: OrderCustomerDraft,
  text: UiMessages["orders"]["form"],
  { phoneRequired = true }: CustomerDraftRules = {},
): CustomerDraftIssues {
  const digits = draft.phone.replace(/\D/g, "")
  const zipCode = draft.address.zipCode.trim()
  const state = draft.address.state.trim()
  const issues: CustomerDraftIssues = {}

  if (draft.name.trim().length < 2) issues.name = text.customerNameInvalid
  // Ten digits is a landline with its area code; fifteen is the longest number a phone can have.
  if ((phoneRequired || draft.phone.trim() !== "") && (digits.length < 10 || digits.length > 15)) issues.phone = text.customerPhoneInvalid
  if (zipCode && !/^\d{5}-?\d{3}$/.test(zipCode)) issues.zipCode = text.zipCodeInvalid
  if (state && !/^[a-z]{2}$/i.test(state)) issues.state = text.stateInvalid
  return issues
}
