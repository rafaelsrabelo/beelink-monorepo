"use client"

// React
import { createContext, useContext, type CSSProperties, type ReactNode } from "react"

// Lib
import { shopPaletteVariables, type ShopColors } from "@harness-monorepo/ui/lib/shop-palette"

const ShopPaletteContext = createContext<CSSProperties | null>(null)

/**
 * The shop's palette, for what leaves the window.
 *
 * A dialog, a sheet, a popover and a select's list are all rendered through a portal, outside the
 * element the `--shop-*` variables are set on, so inside them `var(--shop-primary)` is nothing.
 * The window provides its palette here, and a block that portals puts `useShopPalette()` on the
 * content it portals — the variables alone, never the page's paint, so the overlay keeps its own
 * surface and only its colours become the shop's.
 */
export function ShopPaletteProvider({ colors, children }: { colors: ShopColors; children: ReactNode }) {
  return <ShopPaletteContext.Provider value={shopPaletteVariables(colors)}>{children}</ShopPaletteContext.Provider>
}

/** The variables to put on portaled content, or none outside a shop window — Storybook, the panel. */
export function useShopPalette(): CSSProperties | undefined {
  return useContext(ShopPaletteContext) ?? undefined
}
