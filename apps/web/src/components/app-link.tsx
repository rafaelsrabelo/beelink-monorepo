"use client"

// React
import type { ComponentProps } from "react"

// Next
import Link from "next/link"

/** What the blocks navigate through: next/link, wearing the plain anchor's props. */
export function AppLink({ href, ...props }: ComponentProps<"a"> & { href: string }) {
  return <Link href={href} {...props} />
}
