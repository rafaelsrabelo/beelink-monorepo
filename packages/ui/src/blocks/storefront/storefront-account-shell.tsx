// React
import type { ReactNode } from "react"

// Libs
import { ChevronLeftIcon } from "lucide-react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface StorefrontAccountShellProps {
  menu: ReactNode
  /**
   * The area's front, or one of its tabs. On a phone the front is the menu itself and a tab is a
   * screen of its own, reached from it; from `shop-lg` both stand side by side.
   */
  page: { kind: "overview" } | { kind: "tab"; title: string; backHref: string }
  children: ReactNode
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The shopper's area as 6c to 6h lay it out: a 248px menu on the left and the page beside it. A
 * phone has no room for both, so it shows one — the menu as the area's home, each tab with a way back.
 */
export function StorefrontAccountShell({ menu, page, children, linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontAccountShellProps) {
  const text = messages.storefront
  const tab = page.kind === "tab"

  return (
    <div className="flex flex-col gap-6 py-4 text-shop-on-background shop-lg:flex-row shop-lg:gap-8 shop-lg:py-7">
      <aside className={tab ? "hidden w-[248px] shrink-0 shop-lg:block" : "w-full shrink-0 shop-lg:w-[248px]"}>{menu}</aside>

      <div className={tab ? "flex min-w-0 flex-1 flex-col gap-5" : "hidden min-w-0 flex-1 shop-lg:block"}>
        {tab ? (
          <header className="flex flex-col gap-3">
            <Link href={page.backHref} className="flex w-fit items-center gap-1 text-sm font-semibold text-shop-primary-ink hover:underline shop-lg:hidden">
              <ChevronLeftIcon aria-hidden="true" className="size-4" />
              {text.accountBack}
            </Link>
            <h1 className="text-2xl font-extrabold shop-lg:text-3xl">{page.title}</h1>
          </header>
        ) : null}
        {children}
      </div>
    </div>
  )
}
