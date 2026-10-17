/**
 * Why an address cannot be a page's new one (BEELINK-331), restated here: this package declares no
 * dependency on the contracts. Mirrors `StoreSlugUnavailableReason`; the web checks the two agree.
 */
export type StoreAddressReasonValue = "INVALID" | "RESERVED" | "TAKEN" | "UNCHANGED"

/** What the screen knows of the address being typed, for the block to say. */
export type StoreAddressAvailability =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "available" }
  | { state: "unavailable"; reason: StoreAddressReasonValue }

/** The address as the API would store what is typed — the create form's own normalisation, for a screen's preview. */
export { slugify as storeAddressOf } from "../blocks/store/store-slug"
