// App
import { AffiliatePageEditorScreen } from "@/components/affiliates/affiliate-page-editor-screen"
import { getMessages } from "@/lib/locale"
import { siteOrigin } from "@/lib/site-origin"

/** Every text of the shop's "Seja afiliado" page (plan 2026-11-14), on a screen of its own: a form is never drawn over a list. */
export default async function AffiliateJoinPageEditor({ params }: PageProps<"/admin/[slug]/affiliates/join-page">) {
  const [{ slug }, { ui, locale }, origin] = await Promise.all([params, getMessages(), siteOrigin()])

  return <AffiliatePageEditorScreen slug={slug} origin={origin} locale={locale} messages={ui} />
}
