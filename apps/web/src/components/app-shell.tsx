"use client"

// React
import type { ReactNode } from "react"

// Next
import { usePathname, useRouter } from "next/navigation"

// Types
import type { User } from "@harness-monorepo/contracts"

// UI
import { AppSidebar } from "@harness-monorepo/ui/blocks/dashboard/app-sidebar"
import { WorkspaceSwitcher } from "@harness-monorepo/ui/blocks/dashboard/workspace-switcher"
import { SiteHeader } from "@harness-monorepo/ui/blocks/dashboard/site-header"
import { SidebarInset, SidebarProvider } from "@harness-monorepo/ui/components/sidebar"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Types
import type { Locale, WebMessages } from "@/locales"

// App
import { AppLink } from "@/components/app-link"
import { LocaleSwitcher } from "@/components/locale-switcher"
import { useSignOut } from "@/services/auth/auth-hooks"
import { useMyStores } from "@/services/stores/store-hooks"

export interface AppShellProps {
  user: User
  ui: UiMessages
  web: WebMessages
  locale: Locale
  children: ReactNode
}

export function AppShell({ user, ui, web, locale, children }: AppShellProps) {
  const router = useRouter()
  const pathname = usePathname()
  const signOut = useSignOut()

  // `/admin/<slug>/...`, and nothing else. `/admin` itself is the list of shops and has no slug,
  // which is what keeps that page from rendering a menu for a shop nobody has opened.
  const shopSlug = pathname.match(/^\/admin\/([^/]+)/)?.[1] ?? null

  // The shops this person owns, for the switcher. It is the same query the list page runs, so
  // opening a shop from that page costs no second request — the cache already holds the answer.
  const stores = useMyStores()
  const workspaces = (stores.data ?? []).map((store) => ({
    slug: store.slug,
    name: store.name,
    logoUrl: store.logoUrl,
    href: `/admin/${store.slug}`,
  }))

  return (
    <SidebarProvider>
      <AppSidebar
        user={{ name: user.name, email: user.email }}
        messages={ui}
        // Which shop is being worked in, where the product's own name used to be. A shopkeeper
        // with three shops is three shopkeepers as far as every screen below is concerned, and the
        // one thing they must always be able to answer is whose products these are.
        brandSlot={
          <WorkspaceSwitcher
            current={workspaces.find((workspace) => workspace.slug === shopSlug) ?? null}
            workspaces={workspaces}
            // "Change shop", not "all shops": there is nowhere to be that is every shop at once,
            // so this goes to the doorway and the doorway sends you into one.
            allHref="/admin?switching=1"
            createHref="/create-store"
            loading={stores.isPending}
            linkComponent={AppLink}
            messages={ui}
          />
        }
        brandName={web.metadata.title}
        brandHref={shopSlug ? `/admin/${shopSlug}` : "/admin"}
        linkComponent={AppLink}
        activeHref={pathname}
        signingOut={signOut.isPending}
        onSignOut={() =>
          signOut.mutate(undefined, {
            onSuccess: () => {
              router.replace("/login")
            },
          })
        }
        /*
          Inside a shop the menu becomes that shop's, and outside it the list of shops.

          It used to be two items and only ever two, on the grounds that a menu growing a branch
          when you open a shop changes shape under you. That objection stands and this is not it:
          nothing grows — the menu is replaced, the way it is in every multi-tenant panel a
          shopkeeper has already used. The first item is the door back out, so the swap is never a
          trap, and outside a shop the two original items are exactly what they were.
        */
        /*
          Four items inside a shop, which is what the shop owner asked for by name. Categories are
          not among them on purpose: a category is chosen while a product is being written, so it
          belongs to that form rather than to a page of its own in the menu — the page still exists
          and the form links to it, but it is not a fifth thing to scan past every day.
        */
        navMain={
          shopSlug
            ? [
                { title: web.stores.nav.home, href: `/admin/${shopSlug}` },
                { title: web.stores.nav.orders, href: `/admin/${shopSlug}/orders`, match: "prefix" },
                { title: web.stores.nav.products, href: `/admin/${shopSlug}/products`, match: "prefix" },
                { title: web.stores.nav.customers, href: `/admin/${shopSlug}/customers`, match: "prefix" },
              ]
            : // Unreachable in practice, and empty rather than something: this shell only wraps
              // pages inside a shop, and the one screen that comes before a shop — choosing it —
              // has a layout of its own precisely so that no menu has to be invented for it.
              []
        }
        // At the bottom and away from the four, as every panel of this shape puts it.
        navSecondary={
          shopSlug ? [{ title: web.stores.nav.settings, href: `/admin/${shopSlug}/store` }] : []
        }
      />
      <SidebarInset>
        <SiteHeader
          title={web.dashboard.title}
          actions={<LocaleSwitcher locale={locale} messages={web} />}
        />
        {/* @container/main is what the shop cards and the address grid size themselves against. */}
        <div className="@container/main flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
