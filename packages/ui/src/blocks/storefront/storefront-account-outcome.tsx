// Libs
import { CircleAlertIcon, CircleCheckIcon } from "lucide-react"

export interface StorefrontAccountOutcomeProps {
  /** What went through, or what was refused — already in words. */
  tone: "done" | "failed"
  message: string
}

/**
 * Over a tab of the account after one of its forms: what came of it — a favourite removed, a review
 * sent — or why not. The form's own card may be gone, so the tab says it.
 */
export function StorefrontAccountOutcome({ tone, message }: StorefrontAccountOutcomeProps) {
  const Icon = tone === "done" ? CircleCheckIcon : CircleAlertIcon

  return (
    <p role={tone === "done" ? "status" : "alert"} className="flex items-start gap-2 rounded-xl bg-shop-fill px-4 py-3 text-sm font-semibold text-shop-on-background">
      <Icon aria-hidden="true" className={tone === "done" ? "mt-0.5 size-4 shrink-0 text-shop-positive-ink" : "mt-0.5 size-4 shrink-0 text-shop-muted"} />
      {message}
    </p>
  )
}
