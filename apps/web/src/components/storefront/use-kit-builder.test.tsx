// Libs
import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { useKitBuilder } from "./use-kit-builder"

const kit = {
  size: 3,
  parts: [
    { productId: "p-ninho", variantId: "v-ninho", slug: "ninho", name: "Ninho com Nutella", imageUrl: null, available: true },
    { productId: "p-pacoca", variantId: "v-pacoca", slug: "pacoca", name: "Paçoquinha", imageUrl: null, available: true },
    { productId: "p-limao", variantId: "v-limao", slug: "limao", name: "Torta de Limão", imageUrl: null, available: false },
  ],
}

/** Plan 2026-11-10--kits-monte-seu-kit: a kit being put together on its page. */
describe("useKitBuilder", () => {
  it("is nothing for a product that is no kit", () => {
    expect(renderHook(() => useKitBuilder(null, ptBR.storefront)).result.current).toBeNull()
  })

  it("counts what is chosen, says what is missing, and carries what goes in the cart", () => {
    const { result } = renderHook(() => useKitBuilder(kit, ptBR.storefront))
    expect(result.current?.incomplete).toBe("Escolha mais 3 itens para completar o kit.")

    act(() => result.current!.setCount("p-ninho", 2))
    expect(result.current?.incomplete).toBe("Escolha mais 1 item para completar o kit.")

    act(() => result.current!.setCount("p-pacoca", 1))
    expect(result.current?.incomplete).toBeNull()
    expect(result.current?.chosen).toEqual([{ productId: "p-ninho", qty: 2 }, { productId: "p-pacoca", qty: 1 }])
  })

  it("never goes past the kit's size, nor takes a product that ran out", () => {
    const { result } = renderHook(() => useKitBuilder(kit, ptBR.storefront))

    act(() => result.current!.setCount("p-ninho", 9))
    expect(result.current?.counts["p-ninho"]).toBe(3)
    act(() => result.current!.setCount("p-pacoca", 1))
    expect(result.current?.counts["p-pacoca"]).toBe(0)
    act(() => result.current!.setCount("p-limao", 1))
    expect(result.current?.counts["p-limao"]).toBe(0)
  })

  it("tells two choices apart by what is in them", () => {
    const { result } = renderHook(() => useKitBuilder(kit, ptBR.storefront))
    act(() => result.current!.setCount("p-ninho", 3))
    const first = result.current!.key

    act(() => result.current!.setCount("p-ninho", 2))
    act(() => result.current!.setCount("p-pacoca", 1))
    expect(result.current!.key).not.toBe(first)
  })
})
