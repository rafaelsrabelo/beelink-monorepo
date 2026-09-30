// Libs
import { CircleAlertIcon, CircleCheckIcon } from "lucide-react"

export interface StorefrontFavoritesOutcomeProps {
  /** A remove that went through, or one refused — already in words. */
  tone: "done" | "failed"
  message: string
}

/** Over Favoritos after the heart on a card was pressed: what came of it, since the card is simply gone. */
export function StorefrontFavoritesOutcome({ tone, message }: StorefrontFavoritesOutcomeProps) {
  const Icon = tone === "done" ? CircleCheckIcon : CircleAlertIcon

  return (
    <p role={tone === "done" ? "status" : "alert"} className="flex items-start gap-2 rounded-xl bg-shop-fill px-4 py-3 text-sm font-semibold text-shop-on-background">
      <Icon aria-hidden="true" className={tone === "done" ? "mt-0.5 size-4 shrink-0 text-shop-positive-ink" : "mt-0.5 size-4 shrink-0 text-shop-muted"} />
      {message}
    </p>
  )
}
