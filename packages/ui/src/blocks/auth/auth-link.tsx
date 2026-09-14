// React
import type { ComponentProps, ComponentType } from "react"

/**
 * A block never imports a router. The app passes its own link (next/link); Storybook and tests get
 * a plain anchor, which is why every block renders with no framework behind it.
 *
 * Everything else an anchor accepts passes straight through: the primitives that render a link
 * inject their own props — `aria-current`, data attributes, handlers — and dropping them would
 * silently lose behaviour, not just styling.
 */
export type LinkComponent = ComponentType<ComponentProps<"a"> & { href: string }>

export function AnchorLink({ href, ...props }: ComponentProps<"a"> & { href: string }) {
  return <a href={href} {...props} />
}
