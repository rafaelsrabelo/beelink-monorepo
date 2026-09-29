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
   * The area's front, or one of its tabs. On a phone the front comes first and the menu under it,
   * and a tab is a screen of its own with a way back; from `shop-lg` the menu stands on the left.
   * A tab's `tools` — a search, a filter — sit beside its title, as 6d draws them.
   */
  page: { kind: "overview" } | { kind: "tab"; title: string; backHref: string; tools?: ReactNode }
  children: ReactNode
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The shopper's area as 6c to 6h lay it out: a 248px menu on the left and the page beside it. A
 * phone has no room for both side by side, so the front stacks them and a tab shows itself alone.
 */
export function StorefrontAccountShell({ menu, page, children, linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontAccountShellProps) {
  const text = messages.storefront

  return (
    <div className="flex flex-col gap-6 py-4 text-shop-on-background shop-lg:flex-row shop-lg:gap-8 shop-lg:py-7">
      {/* First in the source, as a sidebar is; on the phone's front it drops below what the front tells. */}
      <aside className={page.kind === "tab" ? "hidden w-[248px] shrink-0 shop-lg:block" : "order-last w-full shrink-0 shop-lg:order-none shop-lg:w-[248px]"}>
        {menu}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-5">
        {page.kind === "tab" ? (
          <header className="flex flex-col gap-3">
            <Link href={page.backHref} className="flex w-fit items-center gap-1 text-sm font-semibold text-shop-primary-ink hover:underline shop-lg:hidden">
              <ChevronLeftIcon aria-hidden="true" className="size-4" />
              {text.accountBack}
            </Link>
            <div className="flex flex-col gap-3 shop-md:flex-row shop-md:items-center">
              <h1 className="shrink-0 text-2xl font-extrabold shop-lg:text-3xl">{page.title}</h1>
              {page.tools ? <div className="min-w-0 shop-md:ml-auto">{page.tools}</div> : null}
            </div>
          </header>
        ) : null}
        {children}
      </div>
    </div>
  )
}
