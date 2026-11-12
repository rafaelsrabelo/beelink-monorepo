// React
import type { ReactNode } from "react"

export interface SettingsRowProps {
  label: string
  /** The id of the control the value is: the label then names it. */
  htmlFor?: string
  /** A line under the label: what the value is for, or who sees it. */
  hint?: string
  /** Beside the value, on the right — an Editar, a Copiar, a Tirar. */
  action?: ReactNode
  children: ReactNode
}

/**
 * One setting: its label on the left, its value in the middle, what can be done to it on the right.
 * On a phone the label and the action share the first line and the value takes the whole second.
 */
export function SettingsRow({ label, htmlFor, hint, action, children }: SettingsRowProps) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 py-4 [grid-template-areas:'label_action''value_value'] sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_auto] sm:[grid-template-areas:'label_value_action']">
      <div className="flex min-w-0 flex-col gap-0.5 [grid-area:label]">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="text-sm font-medium">
            {label}
          </label>
        ) : (
          <span className="text-sm font-medium">{label}</span>
        )}
        {hint ? <span className="text-muted-foreground text-sm">{hint}</span> : null}
      </div>
      <div className="min-w-0 text-sm break-words [grid-area:value]">{children}</div>
      <div className="flex flex-wrap items-start justify-end gap-2 [grid-area:action]">{action}</div>
    </div>
  )
}
