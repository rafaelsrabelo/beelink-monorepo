// App
import { ProductImportScreen } from "@/components/catalog/product-import-screen"
import { getMessages } from "@/lib/locale"

/** A shop's menu, read into products the shopkeeper reviews before they are created as drafts. */
export default async function ProductImportPage({ params }: PageProps<"/admin/[slug]/products/import">) {
  const { slug } = await params
  const { ui, web } = await getMessages()

  return <ProductImportScreen slug={slug} ui={ui} web={web} />
}
