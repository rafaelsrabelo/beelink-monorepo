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

/**
 * The shop whose panel is open, read from the address rather than passed down: the shell is
 * rendered by a layout that is shared by /dashboard and every /admin/<slug> page, and a layout
 * that awaited the params would block the navigation the Suspense boundary exists to cover.
 */
function storeSlugOf(pathname: string): string | null {
  return /^\/admin\/([^/]+)/.exec(pathname)?.[1] ?? null
}

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
  const slug = storeSlugOf(pathname)

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
        // Only what exists, which is why the shop's own two entries appear only once a shop is
        // open: the catalogue, the orders and the delivery settings arrive with the phases that
        // build them, and an item pointing at a page that is not there is a menu that lies.
        navMain={[
          { title: web.stores.nav.list, href: "/dashboard" },
          ...(slug
            ? [
                { title: web.stores.nav.overview, href: `/admin/${slug}` },
                { title: web.stores.nav.settings, href: `/admin/${slug}/store` },
              ]
            : []),
        ]}
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
