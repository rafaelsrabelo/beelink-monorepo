// App
import { ReviewsScreen } from "@/components/reviews/reviews-screen"
import { getMessages } from "@/lib/locale"

/** The shop's reviews (J19). A thin page over a client screen, like every other one in the panel. */
export default async function ReviewsPage({ params }: PageProps<"/admin/[slug]/reviews">) {
  const { slug } = await params
  const { ui, web, locale } = await getMessages()

  return <ReviewsScreen slug={slug} locale={locale} messages={ui} web={web} />
}
