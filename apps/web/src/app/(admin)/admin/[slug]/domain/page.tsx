// App
import { CustomDomainScreen } from "@/components/custom-domain/custom-domain-screen"
import { platformAddressOf } from "@/lib/custom-domain-form"
import { getMessages } from "@/lib/locale"
import { siteOrigin } from "@/lib/site-origin"

/**
 * The shop's own domain (BEELINK-285): where its owner types it, reads what to create at the
 * provider, and follows where it stands. The address the shop has at the platform is read from the
 * request: the panel is served on the platform's host alone.
 */
export default async function CustomDomainPage({ params }: PageProps<"/admin/[slug]/domain">) {
  const [{ slug }, { ui, web, locale }, origin] = await Promise.all([params, getMessages(), siteOrigin()])

  return (
    <CustomDomainScreen
      slug={slug}
      locale={locale}
      address={platformAddressOf(origin, slug)}
      back={{ href: `/admin/${encodeURIComponent(slug)}`, label: web.stores.nav.home }}
      messages={ui}
    />
  )
}
