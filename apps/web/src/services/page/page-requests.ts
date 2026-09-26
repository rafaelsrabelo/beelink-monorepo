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

// App
import { draftWrite } from "./draft-write"
import { call } from "./page-call"

export { PageRequestError } from "./page-call"

const sectionsPath = (slug: string) => `/api/stores/${encodeURIComponent(slug)}/sections`

/** A collection route, on one page: none named is the shop's home, as the API reads it. */
const onPage = (path: string, pageId?: string) => (pageId ? `${path}?pageId=${encodeURIComponent(pageId)}` : path)

export function fetchSections(slug: string, pageId?: string): Promise<Section[]> {
  return call<Section[]>(onPage(sectionsPath(slug), pageId), { method: "GET" })
}

export function createSection(slug: string, payload: CreateSectionPayload, pageId?: string): Promise<Section> {
  return draftWrite(slug, (revision) => call<Section>(onPage(sectionsPath(slug), pageId), { method: "POST", body: JSON.stringify(payload) }, revision))
}

export function updateSection(slug: string, sectionId: string, payload: UpdateSectionPayload): Promise<Section> {
  return draftWrite(slug, (revision) => call<Section>(`${sectionsPath(slug)}/${encodeURIComponent(sectionId)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  }, revision))
}

export function deleteSection(slug: string, sectionId: string): Promise<unknown> {
  return draftWrite(slug, (revision) => call<unknown>(`${sectionsPath(slug)}/${encodeURIComponent(sectionId)}`, { method: "DELETE" }, revision))
}

/**
 * The whole list, in the new order. The API refuses a partial one, which is what stops two bands
 * ending up on the same position and drawing a page that is neither order.
 */
export function reorderSections(slug: string, payload: ReorderPayload, pageId?: string): Promise<Section[]> {
  return draftWrite(slug, (revision) => call<Section[]>(onPage(`${sectionsPath(slug)}/reorder`, pageId), { method: "PUT", body: JSON.stringify(payload) }, revision))
}

const componentsPath = (slug: string) => `/api/stores/${encodeURIComponent(slug)}/components`

export function createComponent(
  slug: string,
  sectionId: string,
  payload: AddComponentPayload,
): Promise<StoreComponent> {
  return draftWrite(slug, (revision) => call<StoreComponent>(`${sectionsPath(slug)}/${encodeURIComponent(sectionId)}/components`, {
    method: "POST",
    body: JSON.stringify(payload),
  }, revision))
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
  pageId?: string,
): Promise<Section> {
  const section = await createSection(slug, payload, pageId)
  await Promise.all(Array.from({ length: alongside }, () => createComponent(slug, section.id, payload.component)))
  return section
}

export function updateComponent(
  slug: string,
  componentId: string,
  payload: UpdateComponentPayload,
): Promise<StoreComponent> {
  return draftWrite(slug, (revision) => call<StoreComponent>(`${componentsPath(slug)}/${encodeURIComponent(componentId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  }, revision))
}

export function deleteComponent(slug: string, componentId: string): Promise<unknown> {
  return draftWrite(slug, (revision) => call<unknown>(`${componentsPath(slug)}/${encodeURIComponent(componentId)}`, { method: "DELETE" }, revision))
}

/**
 * A component into another band, or to another place in its own. Answers the whole page: the band it
 * left may be gone.
 */
export function moveComponent(slug: string, componentId: string, payload: MoveComponentPayload): Promise<Section[]> {
  return draftWrite(slug, (revision) => call<Section[]>(`${componentsPath(slug)}/${encodeURIComponent(componentId)}/section`, {
    method: "PUT",
    body: JSON.stringify(payload),
  }, revision))
}

/** One band's components, in the new order. The band itself does not move. */
export function reorderComponents(
  slug: string,
  sectionId: string,
  payload: ReorderPayload,
): Promise<Section[]> {
  return draftWrite(slug, (revision) => call<Section[]>(`${sectionsPath(slug)}/${encodeURIComponent(sectionId)}/components/reorder`, {
    method: "PUT",
    body: JSON.stringify(payload),
  }, revision))
}

/**
 * A hidden copy of a band and its blocks, right after it. The draft shows it; Publicar sends it to
 * the shop, like anything else the owner arranged.
 */
export function duplicateSection(slug: string, sectionId: string): Promise<Section> {
  return draftWrite(slug, (revision) => call<Section>(`${sectionsPath(slug)}/${encodeURIComponent(sectionId)}/duplicate`, { method: "POST" }, revision))
}

/** A hidden copy of one block, right after it in its band. */
export function duplicateComponent(slug: string, componentId: string): Promise<StoreComponent> {
  return draftWrite(slug, (revision) => call<StoreComponent>(`${componentsPath(slug)}/${encodeURIComponent(componentId)}/duplicate`, { method: "POST" }, revision))
}
