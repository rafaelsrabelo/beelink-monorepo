// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Block
import type { ComponentDisplay } from "./design-types"
import { LayoutShape } from "./layout-thumbnail-shapes"

export interface LayoutThumbnailProps {
  display: ComponentDisplay
  className?: string
}

/**
 * A layout drawn small, the way the layout picker offers it: the arrangement and not the content,
 * so one drawing tells "Dividida" from "Imagem ao fundo" whatever the section holds. Decorative —
 * the picker names each one in words beside it.
 */
export function LayoutThumbnail({ display, className }: LayoutThumbnailProps) {
  return (
    <span aria-hidden="true" className={cn("bg-background flex h-12 w-20 shrink-0 rounded-md border p-1.5", className)}>
      <LayoutShape display={display} />
    </span>
  )
}
