// Libs
import { describe, expect, it } from "vitest"

// Types
import type { ComponentKind, DeviceVisibility, PublicComponent, PublicSection } from "@harness-monorepo/contracts"

// App
import { deviceRhythmOf, forDevice, shownClassOf, shownOn, spacingClassOf } from "./device-visibility"

function block(kind: ComponentKind, visibleOn?: DeviceVisibility): PublicComponent {
  return {
    id: `${kind}-${visibleOn ?? "any"}`,
    kind,
    title: "x",
    subtitle: null,
    body: "x",
    span: "FULL",
    display: null,
    source: null,
    sourceCategory: null,
    items: [],
    columns: null,
    align: null,
    ...(visibleOn ? { visibleOn } : {}),
  }
}

function band(components: PublicComponent[], width: PublicSection["width"] = "CONTAINED", background: string | null = null): PublicSection {
  return { id: components.map((component) => component.id).join("+"), name: null, width, background, components }
}

describe("shownOn / forDevice", () => {
  // A page cached before the field existed showed everything, and still does.
  it("shows a component with no say everywhere", () => {
    expect([shownOn(undefined, "PHONE"), shownOn(undefined, "DESKTOP")]).toEqual([true, true])
    expect([shownOn("DESKTOP", "PHONE"), shownOn("DESKTOP", "DESKTOP")]).toEqual([false, true])
  })

  // A band shows wherever one of its blocks does, and draws only those there.
  it("keeps a band on a device only with the blocks shown there", () => {
    const mixed = band([block("HEADING", "DESKTOP"), block("TEXT", "PHONE")])

    expect(forDevice(mixed, "PHONE")?.components.map((component) => component.kind)).toEqual(["TEXT"])
    expect(forDevice(band([block("HEADING", "DESKTOP")]), "PHONE")).toBeNull()
  })
})

describe("deviceRhythmOf — the page's spacing on each side of 768px", () => {
  // A cover only on the computer: the tinted band meets it there, and meets the header on the phone.
  it("works the spacing out over what each device draws", () => {
    const cover = band([block("BANNER", "DESKTOP")], "FULL")
    const tinted = band([block("TEXT")], "CONTAINED", "oklch(0.7 0.15 160)")

    const [coverRhythm, tintedRhythm] = deviceRhythmOf([cover, tinted])

    expect(coverRhythm?.phone).toBeNull()
    expect(coverRhythm?.desktop).toMatchObject({ spaceBefore: false })
    expect(tintedRhythm?.desktop).toMatchObject({ spaceBefore: false, padded: true })
    expect(tintedRhythm?.phone).toMatchObject({ spaceBefore: false, padded: true })
  })

  // A plain band only on the computer: under it the tinted band keeps its 32px there, and on the phone,
  // where nothing is drawn above it but the header, it meets the header. One shared rhythm cannot say both.
  it("gives a band the space before it that each device's neighbour asks for", () => {
    const words = band([block("TEXT", "DESKTOP")])
    const tinted = band([block("HEADING")], "CONTAINED", "oklch(0.7 0.15 160)")

    const [, tintedRhythm] = deviceRhythmOf([words, tinted])

    expect(tintedRhythm?.desktop?.spaceBefore).toBe(true)
    expect(tintedRhythm?.phone?.spaceBefore).toBe(false)
  })

  // A coloured edge-to-edge band of a picture and words: pictures only on the phone, so no padding there.
  it("pads a band's colour only where it holds words", () => {
    const mixed = band([block("BANNER"), block("TEXT", "DESKTOP")], "FULL", "oklch(0.3 0.1 20)")

    const [rhythm] = deviceRhythmOf([mixed])

    expect(rhythm?.phone?.padded).toBe(false)
    expect(rhythm?.desktop?.padded).toBe(true)
  })

  // A band whose words show only on the phone leaves no empty coloured strip on the computer.
  it("draws no band on a device where none of its blocks shows", () => {
    const [only] = deviceRhythmOf([band([block("HEADING", "PHONE")], "CONTAINED", "oklch(0.5 0.1 20)")])

    expect(only).toEqual({ phone: { spaceBefore: false, padded: true }, desktop: null })
  })
})

describe("the classes", () => {
  it("hides on the side that does not draw it", () => {
    expect(shownClassOf(true, true)).toBeUndefined()
    expect(shownClassOf(true, false)).toBe("shop-md:hidden")
    expect(shownClassOf(false, true)).toBe("hidden shop-md:block")
  })

  it("spaces on the side that wants it", () => {
    expect(spacingClassOf("space", true, true)).toBe("mt-8")
    expect(spacingClassOf("space", true, false)).toBe("mt-8 shop-md:mt-0")
    expect(spacingClassOf("padding", false, true)).toBe("shop-md:py-8")
    expect(spacingClassOf("padding", false, false)).toBeUndefined()
  })
})
