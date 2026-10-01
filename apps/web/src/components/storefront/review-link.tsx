"use client"

// React
import type { ComponentProps } from "react"

// Next
import { useSearchParams } from "next/navigation"

// App
import { AppLink } from "@/components/app-link"

/**
 * A link of the product's reviews that keeps the combination chosen now. The section is drawn on the
 * server with the address the page opened with, and choosing a combination only rewrites the address
 * in place — so the link reads `variant` at render, not from the server.
 */
export function ReviewLink({ href, ...rest }: ComponentProps<typeof AppLink>) {
  const variant = useSearchParams().get("variant")
  const url = new URL(String(href), "http://shop.invalid")
  if (variant) url.searchParams.set("variant", variant)
  else url.searchParams.delete("variant")
  return <AppLink href={`${url.pathname}${url.search}${url.hash}` as typeof href} {...rest} />
}
