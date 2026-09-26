// Types
import type { DeviceVisibility, PublicSection } from "@harness-monorepo/contracts"

// App
import { rhythmOf, type BandRhythm } from "./band-rhythm"

/** The two sides of the shop window's `md` width, 768px: a phone below it, a computer at or above. */
export type Device = "PHONE" | "DESKTOP"

/** Absent is everywhere: a page cached before the field existed showed everything. */
export function shownOn(visibleOn: DeviceVisibility | undefined, device: Device): boolean {
  return visibleOn === undefined || visibleOn === "ALL" || visibleOn === device
}

/** The band as one device draws it — the blocks shown there — or null when none of them is. */
export function forDevice(section: PublicSection, device: Device): PublicSection | null {
  const components = section.components.filter((component) => shownOn(component.visibleOn, device))
  return components.length ? { ...section, components } : null
}

/** Each band's rhythm on each device, null where it does not show. */
export interface DeviceRhythm {
  phone: BandRhythm | null
  desktop: BandRhythm | null
}

/**
 * The page's spacing worked out once per device, over the bands that device draws.
 *
 * Per device and not once: a cover shown only on the computer is the surface a band sits flush
 * under there, and on the phone the band under it starts under the header, 32px down. One rhythm
 * for both would be right on one screen and wrong on the other.
 */
export function deviceRhythmOf(sections: readonly PublicSection[]): DeviceRhythm[] {
  const on = (device: Device) => {
    const drawn = sections.map((section) => forDevice(section, device))
    const rhythm = rhythmOf(drawn.filter((section) => section !== null))
    let at = 0
    return drawn.map((section) => (section ? (rhythm[at++] ?? null) : null))
  }
  const phone = on("PHONE")
  const desktop = on("DESKTOP")

  return sections.map((_, index) => ({ phone: phone[index] ?? null, desktop: desktop[index] ?? null }))
}

/** Hidden on the side that does not draw it. Spelled whole, so Tailwind finds every class. */
export function shownClassOf(phone: boolean, desktop: boolean): string | undefined {
  if (phone && desktop) return undefined
  if (phone) return "shop-md:hidden"
  if (desktop) return "hidden shop-md:block"
  return "hidden"
}

const SPACING = {
  space: { both: "mt-8", phone: "mt-8 shop-md:mt-0", desktop: "shop-md:mt-8" },
  padding: { both: "py-8", phone: "py-8 shop-md:py-0", desktop: "shop-md:py-8" },
} as const

/** The page's 32px, above a band or inside its colour, on the side that wants it. */
export function spacingClassOf(kind: keyof typeof SPACING, phone: boolean, desktop: boolean): string | undefined {
  const classes = SPACING[kind]
  if (phone && desktop) return classes.both
  if (phone) return classes.phone
  if (desktop) return classes.desktop
  return undefined
}
