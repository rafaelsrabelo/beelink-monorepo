// React
import type { ReactNode, Ref } from "react"

export interface StorefrontFooterActionProps {
  children: ReactNode
  onClick: () => void
  ref?: Ref<HTMLButtonElement>
}

/**
 * A line of the footer that does something on this page instead of leading somewhere: the way back
 * to the cookie choice (BEELINK-271). A button and not a link with no address — a screen reader says
 * which of the two it is — drawn like the links it sits among, in the footer's own ink.
 */
export function StorefrontFooterAction({ children, onClick, ref }: StorefrontFooterActionProps) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className="cursor-pointer text-left opacity-80 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
    >
      {children}
    </button>
  )
}
