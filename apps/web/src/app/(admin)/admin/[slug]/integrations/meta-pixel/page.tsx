// App
import { MetaPixelScreen } from "@/components/integrations/meta-pixel-screen"
import { getMessages } from "@/lib/locale"

/**
 * The shop's Meta Pixel (BEELINK-270): the ID its owner pastes here, and where it is found at Meta.
 * Nothing arrives in the address: no third party sends the browser back.
 */
export default async function MetaPixelPage({ params }: PageProps<"/admin/[slug]/integrations/meta-pixel">) {
  const [{ slug }, { ui }] = await Promise.all([params, getMessages()])

  return <MetaPixelScreen slug={slug} messages={ui} />
}
