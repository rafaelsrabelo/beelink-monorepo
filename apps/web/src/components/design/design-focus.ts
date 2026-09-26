/**
 * The part of the editor a key was pressed in: a drawer, the preview, or a side column, as the frame
 * marks them. Not by tag: the preview draws the shop inline, and the shop has a `<main>` of its own.
 */
export function regionOf(element: Element): HTMLElement | null {
  return element.closest<HTMLElement>("[data-design-region]")
}

function focusableIn(node: HTMLElement): HTMLElement | null {
  return node.matches("button, [tabindex]") ? node : node.querySelector<HTMLElement>("button:not([disabled])")
}

function drawnStop(region: HTMLElement | null, key: string): HTMLElement | null {
  const selector = `[data-design-node="${CSS.escape(key)}"]`
  const drawn = (node: HTMLElement) => node.getClientRects().length > 0
  const node =
    (region ? [...region.querySelectorAll<HTMLElement>(selector)].find(drawn) : undefined) ??
    [...document.querySelectorAll<HTMLElement>(selector)].find(drawn)
  return node ? focusableIn(node) : null
}

/*
  `preventScroll`, and the region scrolled by hand: the preview paints under `transform: scale()`,
  where the browser's own scroll-into-view resolves the box through the transform and scrolls by an
  amount that does not match what the owner sees. The rectangles are both on screen, so their
  difference is the distance as drawn.
*/
function place(target: HTMLElement): void {
  target.focus({ preventScroll: true })
  const scroller = regionOf(target)
  if (!scroller) return
  const box = target.getBoundingClientRect()
  const view = scroller.getBoundingClientRect()
  if (box.top < view.top || box.bottom > view.bottom) scroller.scrollBy({ top: box.top - view.top - view.height / 3 })
}

/**
 * Puts the focus on the first of `keys` that is drawn — in `region` where it is drawn there, else
 * wherever it is drawn first — once the render that draws it has landed. `onMissed` hears when none
 * is: a hidden block leaves the preview, and a narrow screen keeps the structure in a closed drawer.
 */
export function focusNode(region: HTMLElement | null, keys: string | readonly string[], onMissed?: () => void): void {
  requestAnimationFrame(() => {
    for (const key of typeof keys === "string" ? [keys] : keys) {
      const target = drawnStop(region, key)
      if (target) return place(target)
    }
    onMissed?.()
  })
}

/**
 * Back into the bar of `key` after one of its buttons moved it: React re-inserts the block that moved,
 * and the focused button with it. The same button while it is enabled, else the bar's first that is.
 */
export function focusBar(key: string, shortcut: string): void {
  requestAnimationFrame(() => {
    const bar = document.querySelector<HTMLElement>(`[role="toolbar"][data-design-node="${CSS.escape(key)}"]`)
    const same = bar?.querySelector<HTMLElement>(`button[aria-keyshortcuts="${CSS.escape(shortcut)}"]:not([disabled])`)
    const target = same ?? bar?.querySelector<HTMLElement>("button:not([disabled])")
    if (target) place(target)
  })
}

/**
 * Scrolls the preview to a section the owner just added, without taking the focus — the panel's
 * heading takes it. Waited for: the new block is drawn only once the page is read again and the
 * draft takes it in, a few frames after the write that made it.
 */
export function revealInPreview(keys: readonly string[], frames = 60): void {
  requestAnimationFrame(() => {
    const preview = document.querySelector<HTMLElement>("main[data-design-region]")
    const node = keys
      .map((key) => preview?.querySelector<HTMLElement>(`[data-design-node="${CSS.escape(key)}"]`))
      .find((candidate) => candidate && candidate.getClientRects().length > 0)
    if (!preview || !node) return frames > 0 ? revealInPreview(keys, frames - 1) : undefined

    const box = node.getBoundingClientRect()
    const view = preview.getBoundingClientRect()
    if (box.top < view.top || box.bottom > view.bottom) preview.scrollBy({ top: box.top - view.top - view.height / 4, behavior: "smooth" })
  })
}
