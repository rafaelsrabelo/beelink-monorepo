// Libs
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { Section } from "@harness-monorepo/contracts"

// App
import { toDraft } from "./design-draft"
import { useBlockInsert } from "./use-block-insert"

type Options = { onSuccess?: (value: unknown) => void }

const addSection = { mutate: vi.fn(), isPending: false }
const addToBand = { mutate: vi.fn(), isPending: false }
const move = { mutate: vi.fn(), isPending: false }

vi.mock("@/services/page/page-hooks", () => ({
  useCreateSection: () => addSection,
  useCreateComponent: () => addToBand,
  useMoveComponent: () => move,
}))

function band(id: string, components: { id: string; span: "FULL" | "HALF" | "THIRD" }[]): Section {
  return {
    id,
    name: null,
    width: "CONTAINED",
    background: null,
    position: 0,
    isActive: true,
    createdAt: "",
    updatedAt: "",
    components: components.map((component, position) => ({
      id: component.id,
      kind: "BANNER",
      title: null,
      subtitle: null,
      body: null,
      span: component.span,
      display: "CAROUSEL",
      source: null,
      sourceCategoryId: null,
      sourceCategory: null,
      limit: null,
      items: [],
      columns: null,
      align: null,
      position,
      isActive: true,
      createdAt: "",
      updatedAt: "",
    })),
  } as unknown as Section
}

const saved = [band("top", [{ id: "a", span: "THIRD" }]), band("below", [{ id: "b", span: "FULL" }])]

function hook() {
  const draft = { rows: saved.map(toDraft), saved, patchComponent: vi.fn() }
  const onCreated = vi.fn()
  const view = renderHook(() => useBlockInsert("loja", draft, onCreated))
  return { ...view, draft, onCreated }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("useBlockInsert", () => {
  // At the band's foot the newcomer takes the room left, so it lands beside the third and not under it.
  it("gives a block added at a band's foot the room its last row has left", () => {
    const { result } = hook()

    act(() => result.current.setInsertAt({ level: "block", sectionId: "top", index: 1 }))
    act(() => result.current.insert("BANNER"))

    expect(addToBand.mutate).toHaveBeenCalledWith(
      { sectionId: "top", payload: { kind: "BANNER", position: 1, span: "TWO_THIRDS" } },
      expect.anything(),
    )
  })

  it("puts a block beside another with its slice, and gives up the neighbour's room only once it exists", () => {
    const { result, draft, onCreated } = hook()

    act(() =>
      result.current.setInsertAt({ level: "beside", sectionId: "below", index: 1, span: "HALF", rebalance: [{ id: "b", span: "HALF" }] }),
    )
    act(() => result.current.insert("BANNER"))

    expect(addToBand.mutate).toHaveBeenCalledWith(
      { sectionId: "below", payload: { kind: "BANNER", position: 1, span: "HALF" } },
      expect.anything(),
    )
    expect(draft.patchComponent).not.toHaveBeenCalled()

    const options = addToBand.mutate.mock.calls[0]?.[1] as Options
    act(() => options.onSuccess?.({ id: "new", kind: "BANNER" }))

    expect(draft.patchComponent).toHaveBeenCalledWith("b", { span: "HALF" })
    expect(onCreated).toHaveBeenCalledWith({ id: "new", kind: "BANNER" })
  })

  it("moves a lone block up beside the band above's last, and gives up room once it is there", () => {
    const { result, draft } = hook()

    act(() => result.current.panel.onJoinAbove({ componentId: "b", sectionId: "top", index: 1, span: "THIRD", rebalance: [] }))

    expect(move.mutate).toHaveBeenCalledWith(
      { componentId: "b", payload: { sectionId: "top", position: 1, span: "THIRD" } },
      expect.anything(),
    )
    const options = move.mutate.mock.calls[0]?.[1] as Options
    act(() => options.onSuccess?.([]))
    expect(draft.patchComponent).not.toHaveBeenCalled()
  })
})
