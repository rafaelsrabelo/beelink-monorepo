// Types
import type {
  CreateStorePayload,
  Store,
  StoreCategory,
  StoreColorPreset,
  StoreColors,
  UpdateStorePayload,
} from "@harness-monorepo/contracts"

/**
 * What a failed call carries: the API's stable code, never a sentence. The screen turns the code
 * into copy in the reader's language (apps/web/AGENTS.md), through ./store-error-copy.
 */
export class StoreRequestError extends Error {
  constructor(readonly errorCode: string) {
    super(errorCode)
    this.name = "StoreRequestError"
  }
}

/**
 * Declared on every call, a bodyless read included: refuseCrossOrigin() in src/lib/bff.ts answers
 * 415 to a request that does not say it speaks JSON, which is what makes a form posted from
 * another site unable to reach these handlers at all.
 */
const JSON_HEADERS: Record<string, string> = { "content-type": "application/json" }

function errorCodeOf(payload: unknown): string {
  return typeof payload === "object" && payload !== null && "errorCode" in payload
    ? String((payload as { errorCode: unknown }).errorCode)
    : "UNKNOWN"
}

/**
 * Every path here is this app's own route handler. The API's address is server-only, and the token
 * that reaches it lives in a cookie page JavaScript cannot read.
 */
async function call<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(path, { headers: JSON_HEADERS, ...init })

  if (!response.ok) {
    throw new StoreRequestError(errorCodeOf(await response.json().catch(() => null)))
  }

  return (await response.json()) as T
}

/** The shops this person owns, newest first — the ordering is the API's. */
export function fetchMyStores(): Promise<Store[]> {
  return call<Store[]>("/api/stores", { method: "GET" })
}

/** One shop as its owner edits it. The API refuses a slug this person does not own. */
export function fetchStore(slug: string): Promise<Store> {
  return call<Store>(`/api/stores/${encodeURIComponent(slug)}`, { method: "GET" })
}

/** The platform's taxonomy, for the select on the identity tab. */
export function fetchStoreCategories(): Promise<StoreCategory[]> {
  return call<StoreCategory[]>("/api/store-categories", { method: "GET" })
}

/**
 * The named palettes the appearance tab applies in one click. They are read rather than shipped:
 * a palette is four `#RRGGBB` values and `web/no-hex-colors` scans this tree, so the list lives
 * where the shop colours it writes already live — behind the API.
 */
export function fetchStoreColorPresets(): Promise<StoreColorPreset[]> {
  return call<StoreColorPreset[]>("/api/store-color-presets", { method: "GET" })
}

export function createStore(payload: CreateStorePayload): Promise<Store> {
  return call<Store>("/api/stores", { method: "POST", body: JSON.stringify(payload) })
}

/**
 * The four colours, and nothing else the shop owns.
 *
 * Its own call rather than a field of `updateStore`, because that one is a full replacement:
 * omitting `layoutSettings` empties the column. Two screens that both re-post the whole shop
 * overwrite each other with whatever they last read, and design mode is now the second of them.
 */
export function updateStoreColors(slug: string, colors: StoreColors): Promise<Store> {
  return call<Store>(`/api/stores/${encodeURIComponent(slug)}/colors`, {
    method: "PUT",
    body: JSON.stringify(colors),
  })
}

/** A full replacement, not a patch: the form posts every field it owns, as the legacy PUT did. */
export function updateStore(slug: string, payload: UpdateStorePayload): Promise<Store> {
  return call<Store>(`/api/stores/${encodeURIComponent(slug)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}
