// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

export interface BeelinkBagProps {
  className?: string
}

/**
 * Beelink's icon: the shopping bag with the mark on it, drawn from the official artwork (the one
 * the browser tab and the shared link show, as files under `apps/web`). The bag takes the colour of
 * the text around it. The mark and the two rings are cut out of it: they are drawn in the ground's
 * colour, `--beelink-bag-ground`, which whoever places the icon on another ground sets — the
 * brand's yellow is the artwork's own.
 *
 * It says nothing to a reader: the link or the name beside it does.
 */
export function BeelinkBag({ className }: BeelinkBagProps) {
  const ground = "var(--beelink-bag-ground, var(--brand-yellow))"

  return (
    <svg viewBox="240 190 774 774" aria-hidden="true" className={cn("size-8", className)}>
      <path fill="currentColor" d="M400 415H858Q900 415 909 462L986 868Q1001 948 920 948H333Q252 948 267 868L344 462Q353 415 400 415Z" />
      <circle cx="468" cy="470" r="40" fill={ground} />
      <circle cx="783" cy="470" r="40" fill={ground} />
      <path fill="none" stroke="currentColor" strokeWidth={48} strokeLinecap="round" d="M468 462V402A157.5 157.5 0 0 1 783 402V462" />
      <g transform="translate(455 562) scale(0.808)" fill="none" stroke={ground} strokeWidth={40}>
        <path d="M22 0V350H277A140 140 0 0 0 277 70H108" />
        <path d="M108 0V279H253A70 70 0 0 0 253 139H189" />
      </g>
    </svg>
  )
}
