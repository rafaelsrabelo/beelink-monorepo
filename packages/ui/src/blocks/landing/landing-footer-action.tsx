// React
import type { ReactNode, Ref } from "react"

export interface LandingFooterActionProps {
  children: ReactNode
  onClick: () => void
  ref?: Ref<HTMLButtonElement>
}

/**
 * A line of the landing's footer that does something on the page instead of leading somewhere: the
 * way back to the cookie choice (BEELINK-319). A button and not a link with no address — a screen
 * reader says which of the two it is — drawn like the links it stands among.
 */
export function LandingFooterAction({ children, onClick, ref }: LandingFooterActionProps) {
  return (
    <button ref={ref} type="button" onClick={onClick} className="cursor-pointer text-left text-brand-text hover:underline">
      {children}
    </button>
  )
}
