// React
import type { ComponentProps } from "react"

/**
 * An anchor with no `href` navigates nowhere and takes no tab stop.
 *
 * The address is overridden after the spread rather than destructured away: React drops an
 * attribute set to `undefined`, and this form leaves no variable that exists only to be ignored.
 */
export function InertLink(props: ComponentProps<"a"> & { href: string }) {
  return <a {...props} href={undefined} />
}
