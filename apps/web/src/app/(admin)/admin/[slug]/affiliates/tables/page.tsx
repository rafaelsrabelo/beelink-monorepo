// App
import { CommissionTablesScreen } from "@/components/affiliates/commission-tables-screen"
import { getMessages } from "@/lib/locale"

/** The shop's commission tables (IMPULSEIA-102). */
export default async function CommissionTablesPage({ params }: PageProps<"/admin/[slug]/affiliates/tables">) {
  const { slug } = await params
  const { ui, locale } = await getMessages()

  return <CommissionTablesScreen slug={slug} locale={locale} messages={ui} />
}
