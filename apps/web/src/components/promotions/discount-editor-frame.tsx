// React
import type { ReactNode } from "react"

// Libs
import { ArrowLeftIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"

// App
import { AppLink } from "@/components/app-link"

export interface DiscountEditorFrameProps {
  title: string
  /** The list, at the status and the page it was left on. */
  backHref: string
  backLabel: string
  /** The read of the one being edited failed, in a sentence: said in place of the form. */
  failure?: string | undefined
  onRetry: () => void
  retryLabel: string
  children: ReactNode
}

/** The page around a promotion's or a coupon's form: the way back to the list, the title, and the form or why it is missing. */
export function DiscountEditorFrame({ title, backHref, backLabel, failure, onRetry, retryLabel, children }: DiscountEditorFrameProps) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 lg:px-6">
      <header className="flex flex-col gap-2">
        <AppLink
          href={backHref}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex w-fit items-center gap-1 rounded-sm text-sm outline-none focus-visible:ring-2"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          {backLabel}
        </AppLink>
        <h1 className="text-2xl font-semibold">{title}</h1>
      </header>

      {failure ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border p-4 sm:p-6">
          <p role="alert" className="text-destructive text-sm">
            {failure}
          </p>
          <Button variant="outline" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      ) : (
        <section aria-label={title} className="bg-card rounded-xl border p-4 sm:p-6">
          {children}
        </section>
      )}
    </div>
  )
}
