"use client"

// React
import { useState } from "react"
import type { ComponentProps, ReactNode } from "react"

// Next
import { usePathname, useRouter } from "next/navigation"

// Libs
import {
  HomeIcon,
  InboxIcon,
  LayoutTemplateIcon,
  PackageIcon,
  SettingsIcon,
  ShoppingBagIcon,
  TagsIcon,
  UsersIcon,
} from "lucide-react"

// Types
import type { User } from "@harness-monorepo/contracts"

// UI
import { AdminBell } from "@harness-monorepo/ui/blocks/admin/admin-bell"
import { AdminHeader } from "@harness-monorepo/ui/blocks/admin/admin-header"
import { AdminSearch } from "@harness-monorepo/ui/blocks/admin/admin-search"
import { AdminShell } from "@harness-monorepo/ui/blocks/admin/admin-shell"
import { AdminSidebar } from "@harness-monorepo/ui/blocks/admin/admin-sidebar"
import { AdminStoreMenu } from "@harness-monorepo/ui/blocks/admin/admin-store-menu"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Types
import type { Locale, WebMessages } from "@/locales"
import type { Prefs } from "@/lib/prefs"

// App
import { AppLink } from "@/components/app-link"
import { LocaleSwitcher } from "@/components/locale-switcher"
import { PREFS_COOKIE, PREFS_MAX_AGE } from "@/lib/prefs"
import { useSignOut } from "@/services/auth/auth-hooks"
import { useMyStores } from "@/services/stores/store-hooks"

export interface AppShellProps {
  user: User
  ui: UiMessages
  web: WebMessages
  locale: Locale
  /** Read from the cookie on the server, so the rail renders in its chosen width, never jumping. */
  prefs: Prefs
  children: ReactNode
}

export function AppShell({ user, ui, web, locale, prefs, children }: AppShellProps) {
  const router = useRouter()
  const pathname = usePathname()
  const signOut = useSignOut()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [railCollapsed, setRailCollapsed] = useState(prefs.railCollapsed)

  /**
   * The rail narrows now and is remembered for next time.
   *
   * No `router.refresh()`, unlike the locale switcher: the language changes what the server
   * rendered, and this changes only a width the browser already has. Refreshing the whole tree to
   * move a rail would make an instant control wait on the network.
   */
  function toggleRail() {
    setRailCollapsed((collapsed) => {
      const next = !collapsed
      const value = encodeURIComponent(JSON.stringify({ ...prefs, railCollapsed: next }))
      document.cookie = `${PREFS_COOKIE}=${value};path=/;max-age=${PREFS_MAX_AGE};samesite=lax`

      return next
    })
  }

  // `/admin/<slug>/...`, and nothing else. `/admin` itself is the doorway that picks a shop — it
  // lives in the `(pick)` group, which has no sidebar, so no menu is ever built for it.
  const shopSlug = pathname.match(/^\/admin\/([^/]+)/)?.[1] ?? null

  const stores = useMyStores()
  const workspaces = (stores.data ?? []).map((store) => ({
    slug: store.slug,
    name: store.name,
    logoUrl: store.logoUrl,
    href: `/admin/${store.slug}`,
  }))

  /**
   * Which shop the menu points at: the one in the address, or failing that the first this person
   * owns — so `/dashboard` offers the panel instead of a blank rail. Null only while they have no
   * shop at all, and then the menu keeps its shape and leads nowhere.
   */
  const menuSlug = shopSlug ?? workspaces[0]?.slug ?? null

  // A site has no products, orders, categories or customers to offer a menu for. What it has —
  // its page and its settings — is what the menu shows; leads arrive with their own entry.
  const site = (stores.data ?? []).find((store) => store.slug === menuSlug)?.type === "INSTITUTIONAL"

  /**
   * `href` is unread while `disabled`; there is no address, which is why the item is disabled.
   *
   * The item type is read off the block rather than imported: the package's export map points
   * `./blocks/*` at `.tsx`, so a types-only `.ts` beside a block is not reachable from here — and
   * deriving it means this cannot drift from what the sidebar actually accepts.
   */
  function item(
    title: string,
    path: string,
    icon: ReactNode,
    match?: "prefix",
  ): ComponentProps<typeof AdminSidebar>["items"][number] {
    return {
      title,
      href: menuSlug ? `/admin/${menuSlug}${path}` : "",
      icon,
      disabled: !menuSlug,
      ...(match ? { match } : {}),
    }
  }

  const nav = web.stores.nav

  return (
    <AdminShell
      header={
        <AdminHeader
          brandHref={menuSlug ? `/admin/${menuSlug}` : "/admin"}
          onToggleSidebar={() => setDrawerOpen((open) => !open)}
          onToggleRail={toggleRail}
          railCollapsed={railCollapsed}
          linkComponent={AppLink}
          messages={ui}
          search={<AdminSearch messages={ui} />}
          bell={<AdminBell messages={ui} />}
          storeMenu={
            <AdminStoreMenu
              current={workspaces.find((workspace) => workspace.slug === shopSlug) ?? null}
              workspaces={workspaces}
              createHref="/create-store"
              user={{ name: user.name, email: user.email }}
              signingOut={signOut.isPending}
              onSignOut={() =>
                signOut.mutate(undefined, { onSuccess: () => router.replace("/login") })
              }
              localeSlot={<LocaleSwitcher locale={locale} messages={web} />}
              linkComponent={AppLink}
              messages={ui}
            />
          }
        />
      }
      sidebar={
        <AdminSidebar
          items={
            site
              ? [
                  item(nav.home, "", <HomeIcon />),
                  item(nav.design, "/design", <LayoutTemplateIcon />),
                  item(nav.leads, "/leads", <InboxIcon />, "prefix"),
                ]
              : [
                  item(nav.home, "", <HomeIcon />),
                  item(nav.orders, "/orders", <ShoppingBagIcon />, "prefix"),
                  item(nav.products, "/products", <PackageIcon />, "prefix"),
                  // Categories arrives here in the same change that took the home card away from
                  // it. That card was its only door in the whole panel, and a screen nobody can
                  // reach is a screen that will be reported as deleted.
                  item(nav.categories, "/categories", <TagsIcon />, "prefix"),
                  // No "Banners" entry, and its absence is the fix rather than a tidy-up. A banner
                  // is a component, and a component is made where the page is arranged — two
                  // screens for one thing is what had a top banner showing in design mode and
                  // missing from its own list.
                  item(nav.design, "/design", <LayoutTemplateIcon />),
                  item(nav.customers, "/customers", <UsersIcon />, "prefix"),
                ]
          }
          footerItems={[item(site ? nav.siteSettings : nav.settings, "/store", <SettingsIcon />)]}
          activeHref={pathname}
          open={drawerOpen}
          collapsed={railCollapsed}
          onClose={() => setDrawerOpen(false)}
          linkComponent={AppLink}
          messages={ui}
        />
      }
    >
      {children}
    </AdminShell>
  )
}
