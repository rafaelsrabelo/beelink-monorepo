"use client"

// React
import type { ReactNode } from "react"

// Next
import { useRouter } from "next/navigation"

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
  const signOut = useSignOut()

  return (
    <SidebarProvider>
      <AppSidebar
        user={{ name: user.name, email: user.email }}
        messages={ui}
        linkComponent={AppLink}
        activeHref="/dashboard"
        signingOut={signOut.isPending}
        onSignOut={() =>
          signOut.mutate(undefined, {
            onSuccess: () => {
              router.replace("/login")
            },
          })
        }
        navMain={[
          { title: web.dashboard.navDashboard, href: "/dashboard" },
          { title: web.dashboard.navReports, href: "/dashboard" },
          { title: web.dashboard.navTeam, href: "/dashboard" },
        ]}
        navSecondary={[
          { title: web.dashboard.navSettings, href: "/dashboard" },
          { title: web.dashboard.navHelp, href: "/dashboard" },
        ]}
      />
      <SidebarInset>
        <SiteHeader
          title={web.dashboard.title}
          actions={<LocaleSwitcher locale={locale} messages={web} />}
        />
        {/* @container/main is what the cards and the chart size themselves against. */}
        <div className="@container/main flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
