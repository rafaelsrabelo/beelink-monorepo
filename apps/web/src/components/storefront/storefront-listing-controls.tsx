"use client"

// React
import { useTransition, type FormEvent, type KeyboardEvent, type MouseEvent, type ReactNode } from "react"

// Next
import { useRouter } from "next/navigation"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// App
import { PAGE_KEY } from "@/lib/storefront-routes"

export interface StorefrontListingControlsProps {
  children: ReactNode
  className?: string
}

/** Whether two addresses of one shelf differ by the page alone: a pager click, which scrolls to the top. */
function pagedOnly(next: URL, current: URL): boolean {
  const strip = (url: URL) => {
    const params = new URLSearchParams(url.search)
    params.delete(PAGE_KEY)
    return params.toString()
  }
  return strip(next) === strip(current)
}

/**
 * The listing's one client island. Every filter below it is a plain link or a GET form — that is
 * what works with scripting off and what a crawler follows — and this only changes how they are
 * followed: a narrowing of this same shelf becomes a client navigation, with the old shelf dimmed
 * and marked busy until the new one arrives, instead of a full page load.
 *
 * It reads no filter and holds none: the address stays the state, and the server answers it. Links
 * that leave the shelf — a product, another category — are left to the browser.
 */
export function StorefrontListingControls({ children, className }: StorefrontListingControlsProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function follow(next: URL) {
    const current = new URL(window.location.href)
    const href = `${next.pathname}${next.search}` as Parameters<typeof router.push>[0]
    startTransition(() => router.push(href, { scroll: pagedOnly(next, current) }))
  }

  function onClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

    const anchor = (event.target as Element).closest<HTMLAnchorElement>("a[href]")
    if (!anchor || anchor.target) return

    const next = new URL(anchor.href)
    if (next.origin !== window.location.origin || next.pathname !== window.location.pathname) return

    event.preventDefault()
    follow(next)
  }

  function onSubmitCapture(event: FormEvent<HTMLDivElement>) {
    const form = event.target as HTMLFormElement
    if (form.method.toLowerCase() !== "get") return

    const next = new URL(form.action)
    if (next.origin !== window.location.origin || next.pathname !== window.location.pathname) return

    const params = new URLSearchParams()
    for (const [key, value] of new FormData(form)) if (typeof value === "string" && value) params.append(key, value)
    next.search = params.toString()

    event.preventDefault()
    follow(next)
  }

  // A link wearing the checkbox role answers Space as a checkbox does; a plain link would scroll.
  function onKeyDownCapture(event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement
    if (event.key !== " " || target.getAttribute("role") !== "checkbox" || target.tagName !== "A") return

    event.preventDefault()
    target.click()
  }

  return (
    <div
      aria-busy={pending || undefined}
      data-pending={pending || undefined}
      onClickCapture={onClickCapture}
      onSubmitCapture={onSubmitCapture}
      onKeyDownCapture={onKeyDownCapture}
      className={cn("transition-opacity", pending && "opacity-60", className)}
    >
      {children}
    </div>
  )
}
