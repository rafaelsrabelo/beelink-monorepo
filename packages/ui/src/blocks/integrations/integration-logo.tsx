// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

export interface IntegrationLogoProps {
  /** The brand's own mark, square, as a file the app serves. */
  src: string
  className?: string
}

/**
 * A third party's own mark beside its name, which is why it is read out as nothing. The file is
 * drawn as it came — never recoloured, never redrawn: both marks are only cut to one corner, and
 * the line around them keeps one on a white ground from vanishing into a white card.
 */
export function IntegrationLogo({ src, className }: IntegrationLogoProps) {
  return <img src={src} alt="" width={48} height={48} className={cn("border-shell-border size-12 shrink-0 rounded-xl border object-cover", className)} />
}
