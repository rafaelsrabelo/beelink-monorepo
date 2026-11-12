// App
import { CommissionTableScreen } from "@/components/affiliates/commission-table-screen"
import { getMessages } from "@/lib/locale"

/** One commission table's rates, product by product (IMPULSEIA-102). */
export default async function CommissionTablePage({ params }: PageProps<"/admin/[slug]/affiliates/tables/[tableId]">) {
  const { slug, tableId } = await params
  const { ui, locale } = await getMessages()

  return <CommissionTableScreen slug={slug} tableId={tableId} locale={locale} messages={ui} />
}
