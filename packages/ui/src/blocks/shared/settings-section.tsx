// React
import { useId, type ReactNode } from "react"

export interface SettingsSectionProps {
  title: string
  /** One line under the heading, when the section needs saying what it is for. */
  description?: string
  /** `SettingsRow`s: they draw the thin line between each other. */
  children: ReactNode
}

/**
 * A titled group of settings rows (12/11/2026, the affiliate's record): a small heading, a rule, and
 * rows of label · value · action, as a settings page lays them out.
 */
export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  const id = useId()

  return (
    <section aria-labelledby={id} className="flex flex-col">
      <header className="border-shell-border flex flex-col gap-1 border-b pb-3">
        <h2 id={id} className="text-base font-semibold">
          {title}
        </h2>
        {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
      </header>
      <div className="divide-shell-border flex flex-col divide-y">{children}</div>
    </section>
  )
}
