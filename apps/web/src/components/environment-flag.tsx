export interface EnvironmentFlagProps {
  /** What this deployment is, in the visitor's language. */
  label: string
}

/**
 * The flag a deployment that is not production wears on every page: the same site, with made-up
 * shops and sandbox payments, must never be taken for the real one.
 *
 * Fixed and out of the flow, so no page's height or sticky header has to know of it, and clicks pass
 * through it to whatever it hangs over. The brand's yellow with ink on it and an ink edge: the
 * panel's header is the same yellow, and the edge is what keeps the flag a flag there. Those two
 * tokens are the same in the light theme, the dark one and inside any shop's own colours.
 */
export function EnvironmentFlag({ label }: EnvironmentFlagProps) {
  return (
    <p
      role="status"
      className="bg-brand-yellow text-brand-ink border-brand-ink pointer-events-none fixed top-0 left-1/2 z-[100] -translate-x-1/2 rounded-b-md border border-t-0 px-3 py-1 text-[11px] leading-none font-bold tracking-wider whitespace-nowrap uppercase shadow-md"
    >
      {label}
    </p>
  )
}
