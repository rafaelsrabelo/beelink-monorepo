// App
import { ShopHomeScreen } from "@/components/catalog/shop-home-screen"
import { getMessages } from "@/lib/locale"

/**
 * The panel's home for one shop.
 *
 * It used to redirect to the settings page, on the grounds that there was no overview worth the
 * address. There is one now: every shop is a workspace, and this is where you land when you open
 * one — what is left to set up, and the way into each of those things.
 */
export default async function ShopHomePage({ params }: PageProps<"/admin/[slug]">) {
  const { slug } = await params
  const { ui, web } = await getMessages()

  return <ShopHomeScreen slug={slug} ui={ui} web={web} />
}
