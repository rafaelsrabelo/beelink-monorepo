// React
import type { ReactNode } from "react"

// Libs
import { BellRingIcon, BellOffIcon, ClipboardListIcon, MessageSquareIcon, TicketPercentIcon, type LucideIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import type { GestorNavItem, GestorNavKey } from "./gestor-types"

export type { GestorNavItem, GestorNavKey } from "./gestor-types"

const ICONS: Record<GestorNavKey, LucideIcon> = { orders: ClipboardListIcon, coupons: TicketPercentIcon, conversations: MessageSquareIcon }

export interface GestorFrameProps {
  shopName: string
  /** "terça-feira, 10 de novembro", as the screen writes today. */
  today: string
  nav: readonly GestorNavItem[]
  current: GestorNavKey
  /** The full panel, which the manager leaves out. */
  backHref: string
  soundOn: boolean
  onSoundChange: (on: boolean) => void
  onTestSound: () => void
  children: ReactNode
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** The shop's initials, for its tile: "Dindin da Leia" is "DL" — a "da" or "de" is no word of its name. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter((word) => word.length > 2)
  const letters = words.length > 1 ? `${words[0]![0]}${words[words.length - 1]![0]}` : name.trim().slice(0, 2)
  return letters.toLocaleUpperCase()
}

/**
 * The manager's own frame (plan 2026-11-10--modo-gestor): the shop and the day, its three places,
 * and the bell's switch — a rail beside the screen on a wide one, a band over it on a phone. The
 * panel's menu is left out on purpose: the manager is the counter, not the back office.
 */
export function GestorFrame({ shopName, today, nav, current, backHref, soundOn, onSoundChange, onTestSound, children, linkComponent: Link = AnchorLink, messages = defaultMessages }: GestorFrameProps) {
  const text = messages.gestor

  return (
    <div className="bg-shell-content text-shell-text flex min-h-svh flex-col lg:flex-row">
      <aside className="bg-shell flex flex-col gap-4 p-4 lg:sticky lg:top-0 lg:h-svh lg:w-60 lg:shrink-0 lg:gap-5 lg:py-5">
        <div className="flex items-center gap-3 px-1.5">
          <span aria-hidden="true" className="bg-header text-header-foreground flex size-11 shrink-0 items-center justify-center rounded-xl text-base font-bold">
            {initialsOf(shopName)}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-foreground truncate font-semibold">{shopName}</span>
            <span className="text-shell-muted text-xs first-letter:uppercase">{today}</span>
          </span>
        </div>

        <nav aria-label={text.navLabel} className="-mx-1 flex gap-1 overflow-x-auto px-1 lg:flex-col lg:overflow-visible">
          {nav.map((item) => {
            const Icon = ICONS[item.key]
            const active = item.key === current
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "focus-visible:ring-ring flex min-h-11 shrink-0 items-center gap-2.5 rounded-lg px-3 text-sm whitespace-nowrap outline-none focus-visible:ring-2",
                  active ? "bg-nav-active text-nav-active-foreground font-semibold" : "hover:bg-nav-hover",
                )}
              >
                <Icon aria-hidden="true" className="size-[18px]" />
                <span className="flex-1">{text.nav[item.key]}</span>{" "}
                {item.count ? <span className="bg-primary text-header flex h-5.5 min-w-5.5 items-center justify-center rounded-full px-1.5 text-xs font-bold tabular-nums">{item.count}</span> : null}
              </Link>
            )
          })}
        </nav>

        <div className="bg-shell-surface flex flex-wrap items-center gap-2 rounded-lg p-3 text-sm lg:mt-auto lg:flex-col lg:items-stretch">
          <p className="text-foreground flex items-center gap-2 font-semibold">
            {soundOn ? <BellRingIcon aria-hidden="true" className="size-4" /> : <BellOffIcon aria-hidden="true" className="size-4" />}
            {soundOn ? text.sound.on : text.sound.off}
          </p>
          <p className="text-shell-muted hidden lg:block">{text.sound.hint}</p>
          <div className="ml-auto flex gap-2 lg:ml-0 lg:flex-col">
            <Button type="button" variant="outline" className="h-10" onClick={() => onSoundChange(!soundOn)}>
              {soundOn ? text.sound.turnOff : text.sound.turnOn}
            </Button>
            <Button type="button" variant="ghost" className="h-10" onClick={onTestSound} disabled={!soundOn}>
              {text.sound.test}
            </Button>
          </div>
        </div>
        <Link href={backHref} className="text-shell-text focus-visible:ring-ring rounded-sm px-1.5 text-sm underline-offset-4 outline-none hover:underline focus-visible:ring-2">
          {text.backToPanel}
        </Link>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col gap-5 px-4 py-5 lg:px-7 lg:py-6">{children}</main>
    </div>
  )
}
