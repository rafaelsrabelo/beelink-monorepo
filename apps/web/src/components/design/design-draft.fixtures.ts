// Types
import type { Section, StoreComponent } from "@harness-monorepo/contracts"

// App
import { toDraft, type SectionDraft } from "./design-draft"

/** Three bands the draft's tests arrange: a full-width banner, a heading beside a showcase, and the promises. */
export function component(id: string, over: Partial<StoreComponent> = {}): StoreComponent {
  return {
    id,
    sectionId: "band",
    kind: "HEADING",
    title: id,
    subtitle: null,
    body: null,
    span: "FULL",
    display: null,
    source: null,
    sourceCategoryId: null,
    limit: null,
    items: [],
    columns: null,
    align: null,
    position: 0,
    isActive: true,
    createdAt: "2026-09-23T00:00:00.000Z",
    updatedAt: "2026-09-23T00:00:00.000Z",
    ...over,
  }
}

export function section(id: string, components: StoreComponent[], over: Partial<Section> = {}): Section {
  return {
    id,
    name: null,
    width: "CONTAINED",
    background: null,
    position: 0,
    isActive: true,
    components: components.map((row) => ({ ...row, sectionId: id })),
    createdAt: "2026-09-23T00:00:00.000Z",
    updatedAt: "2026-09-23T00:00:00.000Z",
    ...over,
  }
}

export const saved: Section[] = [
  section("a", [component("a1", { kind: "BANNER", items: [{ id: "s", imageUrl: "/s.jpg", target: "NONE" }] })], {
    width: "FULL",
  }),
  section("b", [component("b1"), component("b2", { kind: "PRODUCTS", title: null })]),
  section("c", [component("c1", { kind: "BENEFITS" })]),
]

export const draft: SectionDraft[] = saved.map(toDraft)
