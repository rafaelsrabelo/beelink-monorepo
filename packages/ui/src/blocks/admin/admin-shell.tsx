"use client"

// React
import type { ReactNode } from "react"

export interface AdminShellProps {
  header: ReactNode
  sidebar: ReactNode
  children: ReactNode
}

/**
 * The panel's frame: a fixed dark bar, a light rail under it, and the content beside the rail.
 *
 * It holds no state and knows nothing about either part — whether the rail is open lives in the
 * screen, because the header's menu button and the rail itself both need it and neither owns the
 * other. What this file owns is the one thing neither can: that the content starts below the bar
 * and that the rail and the content are siblings, so the rail can be sticky rather than floating.
 */
export function AdminShell({ header, sidebar, children }: AdminShellProps) {
  return (
    /*
      The dark goes on the root, not just the bar.

      Below the header the rail and the page are one panel with its top corners cut, and what shows
      through those two corners is the header's own colour continuing down the sides. That is the
      whole effect: it reads as the bar being behind the panel rather than stacked on top of it.
      Give the root the page colour instead and the corners round against themselves — a radius
      nobody can see.
    */
    <div className="bg-header min-h-dvh">
      {header}
      <div className="pt-header flex min-h-dvh">
        {/*
          The rail's colour belongs to this column, not to the rail. The rail is sticky and as tall
          as the window, so on a page taller than one screen everything below it was the root's
          dark showing through — the header's colour, a long way from the header.
        */}
        <div className="bg-shell shrink-0 lg:rounded-tl-xl">{sidebar}</div>
        {/*
          `@container/main` is what the screens inside size against, and it has to be the page
          column rather than the viewport: the rail takes 240px above `lg`, so a viewport breakpoint
          here lays out a table for space this element does not have.
        */}
        <main className="bg-shell-content @container/main min-w-0 flex-1 rounded-t-xl px-4 py-5 lg:rounded-tl-none lg:px-6">
          <div className="mx-auto w-full max-w-[62.375rem]">{children}</div>
        </main>
      </div>
    </div>
  )
}
