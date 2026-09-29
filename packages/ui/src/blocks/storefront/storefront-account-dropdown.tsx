"use client"

// React
import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"

// Libs
import { ChevronDownIcon, LogOutIcon, MessageCircleIcon, PackageIcon, UserRoundIcon } from "lucide-react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

/** The account's pages the header offers, in this order. The web sends only the ones that exist. */
export type StorefrontAccountDropdownKey = "orders" | "profile" | "messages"

export interface StorefrontAccountDropdownItem {
  key: StorefrontAccountDropdownKey
  href: string
}

export interface StorefrontAccountDropdownProps {
  /** The signed-in shopper's full name. */
  name: string
  /** The account's front, "Visão geral": the menu's heading leads there. */
  href: string
  items: readonly StorefrontAccountDropdownItem[]
  /** Where "Sair" posts. */
  signOutAction: string
  messages?: UiMessages
}

const ICONS = { orders: PackageIcon, profile: UserRoundIcon, messages: MessageCircleIcon } as const

/** Long enough to cross from the button to the panel with the pointer, short enough to feel closed. */
const HOVER_CLOSE_MS = 200

const ITEM = "flex h-10 items-center gap-3 rounded-[10px] px-3 text-sm text-shop-on-background hover:bg-shop-fill focus-visible:bg-shop-fill"

/**
 * The header's account for a signed-in shopper: "Olá, Nome" over "Minha conta", opening the
 * account's pages and "Sair" on a hover or a press.
 *
 * A disclosure drawn under its button and not a portaled popover, as "Entregar em": it stays inside
 * the header, in the shop's colours. Links, not a `role="menu"` — Tab walks them. Escape, a press
 * elsewhere or the focus leaving close it.
 */
export function StorefrontAccountDropdown({ name, href, items, signOutAction, messages = defaultMessages }: StorefrontAccountDropdownProps) {
  const text = messages.storefront
  const first = name.trim().split(/\s+/)[0] ?? name
  const greeting = format(text.accountHello, { name: first })
  const labels: Record<StorefrontAccountDropdownKey, string> = {
    orders: text.accountOrders,
    profile: text.accountMenuProfile,
    messages: text.accountMessages,
  }

  // A hover opens it for as long as the pointer stays; a press pins it until it is closed.
  const [openedBy, setOpenedBy] = useState<"hover" | "press" | null>(null)
  const open = openedBy !== null
  const panelId = useId()
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const closing = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancelClosing = () => {
    if (closing.current) clearTimeout(closing.current)
    closing.current = null
  }

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      setOpenedBy(null)
      button.current?.focus()
    }
    const onPress = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpenedBy(null)
    }
    document.addEventListener("keydown", onKey)
    document.addEventListener("pointerdown", onPress)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("pointerdown", onPress)
    }
  }, [open])

  useEffect(() => cancelClosing, [])

  // A phone fires the mouse's enter before the tap's click: hovering on a touch would open the
  // menu and the click would close it again in the same tap.
  const onPointerEnter = (event: ReactPointerEvent) => {
    if (event.pointerType !== "mouse") return
    cancelClosing()
    setOpenedBy((was) => was ?? "hover")
  }
  const onPointerLeave = (event: ReactPointerEvent) => {
    if (event.pointerType !== "mouse" || openedBy !== "hover") return
    cancelClosing()
    closing.current = setTimeout(() => setOpenedBy((was) => (was === "hover" ? null : was)), HOVER_CLOSE_MS)
  }

  return (
    <div
      ref={root}
      className="relative shrink-0"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onBlur={(event) => {
        if (!root.current?.contains(event.relatedTarget as Node | null)) setOpenedBy(null)
      }}
    >
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`${greeting} — ${text.account}`}
        // Opened by the hover, the press the pointer then makes keeps it open instead of closing it.
        onClick={() => setOpenedBy((was) => (was === "press" ? null : "press"))}
        className="flex items-center gap-1.5 rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
      >
        <UserRoundIcon aria-hidden="true" className="size-7 shop-lg:hidden" strokeWidth={1.8} />
        <span aria-hidden="true" className="hidden flex-col text-xs leading-[1.3] shop-lg:flex">
          <span className="max-w-32 truncate opacity-85">{greeting}</span>
          <span className="flex items-center gap-0.5 text-sm font-bold">
            {text.account}
            <ChevronDownIcon className={cn("size-4 transition-transform", open && "rotate-180")} strokeWidth={2.2} />
          </span>
        </span>
      </button>

      {open ? (
        // `pt-2` and not a margin: the gap between the button and the card stays inside the root,
        // so the pointer crossing it never leaves the menu.
        <div className="absolute top-full right-0 z-40 pt-2">
          <nav
            id={panelId}
            aria-label={text.account}
            className="flex w-60 flex-col gap-0.5 rounded-xl border border-shop-line bg-shop-background p-2 text-shop-on-background shadow-lg"
          >
            <a href={href} onClick={() => setOpenedBy(null)} className="flex flex-col rounded-[10px] px-3 py-2 hover:bg-shop-fill focus-visible:bg-shop-fill">
              <span className="truncate text-sm font-bold">{name}</span>
              <span className="text-xs text-shop-muted">{text.accountMenuOverview}</span>
            </a>

            <div role="separator" className="my-1 h-px bg-shop-line" />

            {items.map(({ key, href: itemHref }) => {
              const Icon = ICONS[key]
              return (
                <a key={key} href={itemHref} onClick={() => setOpenedBy(null)} className={ITEM}>
                  <Icon aria-hidden="true" className="size-[18px] shrink-0" strokeWidth={1.8} />
                  {labels[key]}
                </a>
              )
            })}

            <div role="separator" className="my-1 h-px bg-shop-line" />

            <form action={signOutAction} method="post" className="contents">
              <button type="submit" className={cn(ITEM, "w-full text-left")}>
                <LogOutIcon aria-hidden="true" className="size-[18px] shrink-0" strokeWidth={1.8} />
                {text.signOut}
              </button>
            </form>
          </nav>
        </div>
      ) : null}
    </div>
  )
}
