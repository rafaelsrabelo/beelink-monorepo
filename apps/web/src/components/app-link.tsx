"use client"

// React
import type { ComponentProps } from "react"

// Next
import Link from "next/link"

/**
 * With typedRoutes on, next/link narrows href to the union `next typegen` writes from the route
 * tree. The design system's LinkComponent contract is a plain string and cannot depend on it, so
 * the two meet here and nowhere else: one cast, at the one boundary that has to hold it.
 */
type LinkHref = ComponentProps<typeof Link>["href"]

/** What the blocks navigate through: next/link, wearing the plain anchor's props. */
export function AppLink({ href, ...props }: ComponentProps<"a"> & { href: string }) {
  return <Link href={href as LinkHref} {...props} />
}
