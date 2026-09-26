// Libs
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { Section } from "@harness-monorepo/contracts"

// App
import { en as web } from "@/locales/en"
import { toDraft } from "./design-draft"
import { useBlockInsert } from "./use-block-insert"

type Options = { onSuccess?: (value: unknown) => void }

const addSection = { mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null }
const addToBand = { mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null }
const move = { mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null }

vi.mock("@/services/page/page-hooks", () => ({
  useCreateSection: () => addSection,
  useCreateComponent: () => addToBand,
  useMoveComponent: () => move,
}))

function band(
  id: string,
  components: { id: string; span: "FULL" | "HALF" | "THIRD"; isActive?: boolean; visibleOn?: "PHONE" }[],
): Section {
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
      isActive: component.isActive ?? true,
      visibleOn: component.visibleOn ?? "ALL",
      createdAt: "",
      updatedAt: "",
    })),
  } as unknown as Section
}

const saved = [
  band("top", [{ id: "a", span: "THIRD" }]),
  band("below", [{ id: "b", span: "FULL" }]),
  // A hidden block before the last: the grid draws [x, y], the draft holds [x, hidden, y].
  band("mixed", [{ id: "x", span: "THIRD" }, { id: "hidden", span: "HALF", isActive: false }, { id: "y", span: "THIRD" }]),
  // Half for everyone and half kept for the phone: the computer's row has half left.
  band("phone", [{ id: "p", span: "HALF" }, { id: "q", span: "HALF", visibleOn: "PHONE" }]),
]

function hook() {
  const draft = { rows: saved.map(toDraft), saved, patchComponent: vi.fn() }
  const onCreated = vi.fn()
  const view = renderHook(() => useBlockInsert("loja", draft, onCreated, web))
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
      result.current.setInsertAt({ level: "beside", sectionId: "below", afterId: "b", span: "HALF", rebalance: [{ id: "b", span: "HALF" }] }),
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

  it("moves a lone block up beside the band above's last, gives up room once it is there, and opens its fields", () => {
    const { result, draft, onCreated } = hook()

    act(() =>
      result.current.panel.onJoinAbove({ componentId: "b", sectionId: "top", afterId: "a", span: "HALF", rebalance: [{ id: "a", span: "HALF" }] }),
    )

    expect(move.mutate).toHaveBeenCalledWith(
      { componentId: "b", payload: { sectionId: "top", position: 1, span: "HALF" } },
      expect.anything(),
    )
    expect(draft.patchComponent).not.toHaveBeenCalled()

    const options = move.mutate.mock.calls[0]?.[1] as Options
    act(() => options.onSuccess?.([band("top", [{ id: "a", span: "THIRD" }, { id: "b", span: "HALF" }])]))
    expect(draft.patchComponent).toHaveBeenCalledWith("a", { span: "HALF" })
    expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ id: "b" }))
  })

  // The preview's slot knows the block it sits beside, not its index among blocks some of which are hidden.
  it("places a block right after the one it goes beside, counting the hidden ones in between", () => {
    const { result } = hook()

    act(() => result.current.setInsertAt({ level: "beside", sectionId: "mixed", afterId: "y", span: "THIRD", rebalance: [] }))
    act(() => result.current.insert("BANNER"))

    expect(addToBand.mutate).toHaveBeenCalledWith(
      { sectionId: "mixed", payload: { kind: "BANNER", position: 3, span: "THIRD" } },
      expect.anything(),
    )
  })

  it("reads the room at a band's foot from what the grid draws, not from a hidden block", () => {
    const { result } = hook()

    act(() => result.current.setInsertAt({ level: "block", sectionId: "mixed", index: 3 }))
    act(() => result.current.insert("BANNER"))

    // Drawn: two thirds, so the newcomer takes the third left — the hidden half is not a row.
    expect(addToBand.mutate).toHaveBeenCalledWith(
      { sectionId: "mixed", payload: { kind: "BANNER", position: 3, span: "THIRD" } },
      expect.anything(),
    )
  })

  it("reads the room at a band's foot from the computer's row, not from a block kept for the phone", () => {
    const { result } = hook()

    act(() => result.current.setInsertAt({ level: "block", sectionId: "phone", index: 2 }))
    act(() => result.current.insert("BANNER"))

    expect(addToBand.mutate).toHaveBeenCalledWith(
      { sectionId: "phone", payload: { kind: "BANNER", position: 2, span: "HALF" } },
      expect.anything(),
    )
  })

  it("keeps the strip above the header out of the gallery anywhere but where a band is made", () => {
    const { result } = hook()

    act(() => result.current.setInsertAt({ level: "block", sectionId: "top", index: 1 }))
    expect(result.current.unavailableWith(["CONTACT"])).toEqual(["CONTACT", "ANNOUNCEMENT"])

    act(() => result.current.setInsertAt({ level: "band", index: 0 }))
    expect(result.current.unavailableWith(["CONTACT"])).toEqual(["CONTACT"])
  })
})
