// React
import type { ReactNode } from "react"

/**
 * The screens that come before a workspace: choosing one, and nothing else.
 *
 * No sidebar, on purpose. The panel's shell is a shop's shell — it carries that shop's menu and
 * that shop's name — so wrapping the screen where a shop has not been chosen yet in it would mean
 * drawing a menu for a shop nobody picked, or drawing an empty one and calling that a state.
 *
 * There is no "all shops" place to be. A shopkeeper signs in, picks which shop they are working in,
 * and is inside it from that moment; this is the doorway, not a room.
 */
export default function PickLayout({ children }: { children: ReactNode }) {
  return <main className="bg-muted/30 flex min-h-svh items-center justify-center px-4 py-12">{children}</main>
}
