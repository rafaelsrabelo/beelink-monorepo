"use client"

// React
import { useRef, type KeyboardEvent } from "react"

// Libs
import { ArrowDownIcon, ArrowUpIcon, EyeIcon, EyeOffIcon, LayoutGridIcon, Trash2Icon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@harness-monorepo/ui/components/dropdown-menu"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { ComponentDisplay } from "./design-types"

export interface DesignSelectionBarProps {
  /** What the bar acts on, by name: "Banner 1", "Faixa 3". */
  label: string
  canMoveUp: boolean
  canMoveDown: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  /** The formats the block's kind draws, to switch between (`DISPLAYS_OF_KIND`). Absent where it has none. */
  layouts?: readonly ComponentDisplay[]
  layout?: ComponentDisplay | null
  onLayout?: (value: ComponentDisplay) => void
  /** Hidden in the draft: the button shows it again instead. */
  hidden?: boolean
  onToggleHidden: () => void
  /** Absent where nothing may be deleted — the shop's last list of products. */
  onDelete?: () => void
  /** The node the editor's keys walk from, so ↑↓ and Alt+↑↓ work from the bar too. */
  nodeId?: string
  className?: string
  messages?: UiMessages
}

const SHORTCUT = { up: "Alt+ArrowUp", down: "Alt+ArrowDown", delete: "Delete" } as const

/**
 * The chosen block's or band's own actions, over it in the preview: up, down, its layout, hide
 * and delete — what the owner reached for in the structure column while looking at the page.
 *
 * A toolbar: ← → move between its buttons, as the WAI-ARIA toolbar pattern has it. Each button
 * names what it acts on, because a column of "Subir" buttons read aloud says nothing about which.
 * Up, down, the layout and hiding are draft edits, sent by Publicar; delete asks first.
 * Nothing here says which band or block these act on: a block alone in its band acts as its band,
 * and that rule is the screen's.
 */
export function DesignSelectionBar({
  label,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  layouts,
  layout = null,
  onLayout,
  hidden = false,
  onToggleHidden,
  onDelete,
  nodeId,
  className,
  messages = defaultMessages,
}: DesignSelectionBarProps) {
  const text = messages.design.bar
  const names: Record<ComponentDisplay, string> = {
    CAROUSEL: messages.design.displayCarousel,
    GRID: messages.design.displayGrid,
    RAIL: messages.design.displayRail,
  }
  const bar = useRef<HTMLDivElement>(null)

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return
    const items = [...(bar.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])") ?? [])]
    const at = items.findIndex((item) => item === document.activeElement)
    const last = items.length - 1
    const next =
      event.key === "Home" ? 0 : event.key === "End" ? last : event.key === "ArrowRight" ? (at >= last ? 0 : at + 1) : at <= 0 ? last : at - 1
    items[next]?.focus()
    event.preventDefault()
  }

  return (
    <div
      ref={bar}
      role="toolbar"
      aria-label={format(text.label, { name: label })}
      aria-orientation="horizontal"
      {...(nodeId ? { "data-design-node": nodeId } : {})}
      onKeyDown={onKeyDown}
      // Its clicks are its own: the block's cover under it opens the fields, and must not open them again.
      onClick={(event) => event.stopPropagation()}
      className={cn("bg-background/95 text-foreground flex items-center gap-0.5 rounded-full border p-1 shadow-md backdrop-blur", className)}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={format(text.moveUp, { name: label })}
        title={`${format(text.moveUp, { name: label })} (Alt+↑)`}
        aria-keyshortcuts={SHORTCUT.up}
        disabled={!canMoveUp}
        onClick={onMoveUp}
      >
        <ArrowUpIcon aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={format(text.moveDown, { name: label })}
        title={`${format(text.moveDown, { name: label })} (Alt+↓)`}
        aria-keyshortcuts={SHORTCUT.down}
        disabled={!canMoveDown}
        onClick={onMoveDown}
      >
        <ArrowDownIcon aria-hidden="true" />
      </Button>

      {layouts && layouts.length > 1 && onLayout ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={format(text.layout, { name: label })}
                title={format(text.layout, { name: label })}
              />
            }
          >
            <LayoutGridIcon aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuRadioGroup
              value={layout ?? undefined}
              onValueChange={(next: unknown) => {
                const chosen = layouts.find((option) => option === next)
                if (chosen) onLayout(chosen)
              }}
            >
              {layouts.map((option) => (
                // Picked is done: the block shows it in its new format behind the closed menu.
                <DropdownMenuRadioItem key={option} value={option} closeOnClick>
                  {names[option]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={format(hidden ? text.show : text.hide, { name: label })}
        title={format(hidden ? text.show : text.hide, { name: label })}
        onClick={onToggleHidden}
      >
        {hidden ? <EyeIcon aria-hidden="true" /> : <EyeOffIcon aria-hidden="true" />}
      </Button>
      {onDelete ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={format(text.delete, { name: label })}
          title={`${format(text.delete, { name: label })} (Delete)`}
          aria-keyshortcuts={SHORTCUT.delete}
          className="text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2Icon aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  )
}
