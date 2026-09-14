// App
import { LocaleSwitcher } from "@/components/locale-switcher"
import { getMessages } from "@/lib/locale"

/** The frame every signed-out screen shares. The card itself comes from the design system. */
export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const { locale, web } = await getMessages()

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      {children}
      <LocaleSwitcher locale={locale} messages={web} />
    </div>
  )
}
