/** The part of the editor a key was pressed in: a drawer, the preview, or a side column. */
export function regionOf(element: Element): HTMLElement | null {
  return element.closest<HTMLElement>("[role='dialog'], main, aside")
}

function focusableIn(node: HTMLElement): HTMLElement | null {
  return node.matches("button, [tabindex]") ? node : node.querySelector<HTMLElement>("button:not([disabled])")
}

/**
 * Puts the focus on the stop keyed `key` — in `region` where it is drawn there, else wherever it is
 * drawn first — once the render that draws it has landed.
 *
 * `preventScroll`, and the region scrolled by hand: the preview paints under `transform: scale()`,
 * where the browser's own scroll-into-view resolves the box through the transform and scrolls by an
 * amount that does not match what the owner sees. The rectangles are both on screen, so their
 * difference is the distance as drawn.
 */
export function focusNode(region: HTMLElement | null, key: string): void {
  requestAnimationFrame(() => {
    const selector = `[data-design-node="${CSS.escape(key)}"]`
    const drawn = (node: HTMLElement) => node.getClientRects().length > 0
    const inRegion = region ? [...region.querySelectorAll<HTMLElement>(selector)].find(drawn) : undefined
    const node = inRegion ?? [...document.querySelectorAll<HTMLElement>(selector)].find(drawn)
    const target = node ? focusableIn(node) : null
    if (!target) return

    target.focus({ preventScroll: true })
    const scroller = regionOf(target)
    if (!scroller) return
    const box = target.getBoundingClientRect()
    const view = scroller.getBoundingClientRect()
    if (box.top < view.top || box.bottom > view.bottom) scroller.scrollBy({ top: box.top - view.top - view.height / 3 })
  })
}
