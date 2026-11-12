// React
import type { ReactNode } from "react"

export interface AffiliateInviteNoticeProps {
  title: string
  body: string
  /** The one way on from here, when there is one: a link to sign in, a button to sign out. */
  action?: ReactNode
}

/**
 * A state of the invite with nothing to fill in (IMPULSEIA-104): gone, expired, waiting for a sign-in,
 * or open in the wrong account — what happened, and the way on.
 */
export function AffiliateInviteNotice({ title, body, action }: AffiliateInviteNoticeProps) {
  return (
    <div className="flex flex-col gap-3 text-center">
      <h2 className="font-semibold">{title}</h2>
      <p className="text-muted-foreground text-sm">{body}</p>
      {action ? <div className="flex justify-center pt-1">{action}</div> : null}
    </div>
  )
}
