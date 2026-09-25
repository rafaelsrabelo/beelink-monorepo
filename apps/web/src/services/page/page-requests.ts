// Types
import type {
  AddComponentPayload,
  CreateSectionPayload,
  MoveComponentPayload,
  ReorderPayload,
  Section,
  StoreComponent,
  UpdateComponentPayload,
  UpdateSectionPayload,
} from "@harness-monorepo/contracts"

/**
 * What a failed call carries: the API's stable code, never a sentence. The screen turns the code
 * into copy in the reader's language (apps/web/AGENTS.md).
 */
export class PageRequestError extends Error {
  constructor(readonly errorCode: string) {
    super(errorCode)
    this.name = "PageRequestError"
  }
}

/**
 * Declared on every call, a bodyless read included: `refuseCrossOrigin` answers 415 to a request
 * that does not say it speaks JSON, which is what makes a form posted from another site unable to
 * reach these handlers at all.
 */
const JSON_HEADERS: Record<string, string> = { "content-type": "application/json" }

function errorCodeOf(payload: unknown): string {
  return typeof payload === "object" && payload !== null && "errorCode" in payload
    ? String((payload as { errorCode: unknown }).errorCode)
    : "UNKNOWN"
}

/** Every path here is this app's own route handler; the API's address is server-only. */
async function call<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(path, { headers: JSON_HEADERS, ...init })
  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) throw new PageRequestError(errorCodeOf(payload))

  return payload as T
}

const sectionsPath = (slug: string) => `/api/stores/${encodeURIComponent(slug)}/sections`

export function fetchSections(slug: string): Promise<Section[]> {
  return call<Section[]>(sectionsPath(slug), { method: "GET" })
}

export function createSection(slug: string, payload: CreateSectionPayload): Promise<Section> {
  return call<Section>(sectionsPath(slug), { method: "POST", body: JSON.stringify(payload) })
}

export function updateSection(slug: string, sectionId: string, payload: UpdateSectionPayload): Promise<Section> {
  return call<Section>(`${sectionsPath(slug)}/${encodeURIComponent(sectionId)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export function deleteSection(slug: string, sectionId: string): Promise<unknown> {
  return call<unknown>(`${sectionsPath(slug)}/${encodeURIComponent(sectionId)}`, { method: "DELETE" })
}

/**
 * The whole list, in the new order. The API refuses a partial one, which is what stops two bands
 * ending up on the same position and drawing a page that is neither order.
 */
export function reorderSections(slug: string, payload: ReorderPayload): Promise<Section[]> {
  return call<Section[]>(`${sectionsPath(slug)}/reorder`, { method: "PUT", body: JSON.stringify(payload) })
}

const componentsPath = (slug: string) => `/api/stores/${encodeURIComponent(slug)}/components`

export function createComponent(
  slug: string,
  sectionId: string,
  payload: AddComponentPayload,
): Promise<StoreComponent> {
  return call<StoreComponent>(`${sectionsPath(slug)}/${encodeURIComponent(sectionId)}/components`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

/**
 * A band, and `alongside` more of its first block in beside it: a row of banners. The API builds a
 * band around exactly one block, so the others are added into it right after — at once, since each
 * lands last in the band under the shop's lock and they are alike. A failure between the writes
 * leaves a band holding fewer, never an empty one.
 */
export async function createSectionRow(
  slug: string,
  payload: CreateSectionPayload,
  alongside: number,
): Promise<Section> {
  const section = await createSection(slug, payload)
  await Promise.all(Array.from({ length: alongside }, () => createComponent(slug, section.id, payload.component)))
  return section
}

export function updateComponent(
  slug: string,
  componentId: string,
  payload: UpdateComponentPayload,
): Promise<StoreComponent> {
  return call<StoreComponent>(`${componentsPath(slug)}/${encodeURIComponent(componentId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}

export function deleteComponent(slug: string, componentId: string): Promise<unknown> {
  return call<unknown>(`${componentsPath(slug)}/${encodeURIComponent(componentId)}`, { method: "DELETE" })
}

/**
 * A component into another band, or to another place in its own. Answers the whole page: the band it
 * left may be gone.
 */
export function moveComponent(slug: string, componentId: string, payload: MoveComponentPayload): Promise<Section[]> {
  return call<Section[]>(`${componentsPath(slug)}/${encodeURIComponent(componentId)}/section`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

/** One band's components, in the new order. The band itself does not move. */
export function reorderComponents(
  slug: string,
  sectionId: string,
  payload: ReorderPayload,
): Promise<Section[]> {
  return call<Section[]>(`${sectionsPath(slug)}/${encodeURIComponent(sectionId)}/components/reorder`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}
