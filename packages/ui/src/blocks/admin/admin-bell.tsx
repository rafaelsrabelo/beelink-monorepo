// Libs
import { BellIcon } from "lucide-react"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface AdminBellProps {
  unread?: number
  onClick?: () => void
  messages?: UiMessages
}

/**
 * Notifications, in the header's right-hand group.
 *
 * The count goes in the accessible name rather than beside the icon: the dot is a dot, and a screen
 * reader announcing "Notifications" tells a person nothing about whether it is worth opening. One
 * unread has its own sentence because "1 não lidas" is wrong in Portuguese and a dictionary cannot
 * hold the rule that fixes it.
 */
export function AdminBell({ unread = 0, onClick, messages = defaultMessages }: AdminBellProps) {
  const text = messages.shell
  const label =
    unread === 0
      ? text.notifications
      : unread === 1
        ? text.notificationsUnreadOne
        : format(text.notificationsUnread, { count: String(unread) })

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="bg-header-field text-header-foreground hover:bg-header-field-hover focus-visible:ring-header-foreground/70 relative grid size-8 place-items-center rounded-lg outline-none focus-visible:ring-2"
    >
      <BellIcon aria-hidden="true" className="size-4" />
      {unread > 0 ? (
        <span aria-hidden="true" className="bg-header-accent absolute top-1.5 right-1.5 size-1.5 rounded-full" />
      ) : null}
    </button>
  )
}
