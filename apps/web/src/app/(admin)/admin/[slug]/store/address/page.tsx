// App
import { StoreAddressScreen } from "@/components/store/store-address-screen"
import { getMessages } from "@/lib/locale"
import { requireUser } from "@/lib/session"
import { siteOrigin } from "@/lib/site-origin"
import { CHANGED_KEY, platformPrefixOf } from "@/lib/store-address"

/**
 * A page's new address (BEELINK-331), on a route of its own under the page's settings — a form is
 * never drawn over a list. The platform's part of the address is read from the request: the panel is
 * served on the platform's host alone.
 */
export default async function StoreAddressPage({ params, searchParams }: PageProps<"/admin/[slug]/store/address">) {
  await requireUser()
  const [{ slug }, query, { ui, web, locale }, origin] = await Promise.all([params, searchParams, getMessages(), siteOrigin()])

  return (
    <StoreAddressScreen
      slug={slug}
      prefix={platformPrefixOf(origin)}
      changed={query[CHANGED_KEY] === "1"}
      back={{ href: `/admin/${encodeURIComponent(slug)}/store`, label: web.stores.nav.settings }}
      locale={locale}
      ui={ui}
      web={web}
    />
  )
}
