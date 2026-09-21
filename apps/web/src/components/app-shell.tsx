"use client"

// React
import type { ReactNode } from "react"

// Next
import { usePathname, useRouter } from "next/navigation"

// Types
import type { User } from "@harness-monorepo/contracts"

// UI
import { AppSidebar } from "@harness-monorepo/ui/blocks/dashboard/app-sidebar"
import { SiteHeader } from "@harness-monorepo/ui/blocks/dashboard/site-header"
import { SidebarInset, SidebarProvider } from "@harness-monorepo/ui/components/sidebar"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Types
import type { Locale, WebMessages } from "@/locales"

// App
import { AppLink } from "@/components/app-link"
import { LocaleSwitcher } from "@/components/locale-switcher"
import { useSignOut } from "@/services/auth/auth-hooks"

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

  return (
    <SidebarProvider>
      <AppSidebar
        user={{ name: user.name, email: user.email }}
        messages={ui}
        // Passed, because the default is the template's own name and nobody was passing anything:
        // a shopkeeper's panel said "Harness" over their shop. `metadata.title` is the product's
        // name and already the one in the browser tab, so there is one place it is written.
        brandName={web.metadata.title}
        brandHref="/dashboard"
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
        navMain={
          shopSlug
            ? [
                { title: web.stores.nav.back, href: "/admin" },
                // No "overview" item: `/admin/<slug>` redirects to the settings page, and a menu
                // entry that lands on another menu entry is a bug with a label on it. It comes back
                // the day that address is a page of its own.
                { title: web.stores.nav.products, href: `/admin/${shopSlug}/products`, match: "prefix" },
                { title: web.stores.nav.categories, href: `/admin/${shopSlug}/categories`, match: "prefix" },
                { title: web.stores.nav.showcases, href: `/admin/${shopSlug}/showcases`, match: "prefix" },
                { title: web.stores.nav.settings, href: `/admin/${shopSlug}/store` },
              ]
            : [
                { title: web.stores.nav.dashboard, href: "/dashboard" },
                { title: web.stores.nav.list, href: "/admin", match: "prefix" },
              ]
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
