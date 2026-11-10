// App
import { GestorShell } from "@/components/gestor/gestor-shell"
import { getMessages } from "@/lib/locale"

/** The manager's frame and bell around its three screens: one shop's, named by the address. */
export default async function GestorShopLayout({ children, params }: LayoutProps<"/admin/[slug]/gestor">) {
  const { slug } = await params
  const { ui, locale } = await getMessages()

  return (
    <GestorShell slug={slug} locale={locale} messages={ui}>
      {children}
    </GestorShell>
  )
}
