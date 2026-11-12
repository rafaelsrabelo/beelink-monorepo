// App
import { AffiliateWizardScreen } from "@/components/affiliates/wizard/affiliate-wizard-screen"
import { getMessages } from "@/lib/locale"

/** "Convidar afiliado": the invite, step by step (the user's design, 12/11/2026). */
export default async function NewAffiliatePage({ params }: PageProps<"/admin/[slug]/affiliates/new">) {
  const { slug } = await params
  const { ui, locale } = await getMessages()

  return <AffiliateWizardScreen slug={slug} locale={locale} messages={ui} />
}
