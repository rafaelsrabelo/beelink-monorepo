"use client"

// React
import { useRef, type KeyboardEvent } from "react"

// Libs
import { ArrowDownIcon, ArrowUpIcon, CopyPlusIcon, EyeIcon, EyeOffIcon, LayoutGridIcon, Trash2Icon } from "lucide-react"

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
  /** The formats the block's kind draws, to switch between (`SECTION_TYPES`). Absent where it has none. */
  layouts?: readonly ComponentDisplay[]
  layout?: ComponentDisplay | null
  onLayout?: (value: ComponentDisplay) => void
  /** Absent on the strip, which is one per shop. */
  onDuplicate?: () => void
  /** A copy on its way: Duplicar waits for it, so one press is one copy. */
  duplicating?: boolean
  /** Hidden in the draft: the button shows it again instead. */
  hidden?: boolean
  onToggleHidden: () => void
  /** Absent where nothing may be deleted — the shop's last list of products. */
  onDelete?: () => void
  /** Why the last action here was refused, shown under the bar: the status line is heard, not seen. */
  error?: string
  /** The node the editor's keys walk from, so ↑↓ and Alt+↑↓ work from the bar too. */
  nodeId?: string
  className?: string
  messages?: UiMessages
}

/** The keys the editor answers with the same actions, as each button declares them. */
export const SELECTION_BAR_SHORTCUTS = {
  up: "Alt+ArrowUp",
  down: "Alt+ArrowDown",
  duplicate: "Control+D Meta+D",
  delete: "Delete",
} as const
const SHORTCUT = SELECTION_BAR_SHORTCUTS

/**
 * The chosen block's or band's own actions, over it in the preview: up, down, its layout, a copy,
 * hide and delete — what the owner reached for in the structure column while looking at the page.
 *
 * A toolbar: ← → move between its buttons, as the WAI-ARIA toolbar pattern has it. Each button
 * names what it acts on, because a column of "Subir" buttons read aloud says nothing about which.
 * Up, down, the layout and hiding are draft edits, sent by Publicar; a copy is made hidden and shown
 * in the draft, so it waits for Publicar too; delete asks first.
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
  onDuplicate,
  duplicating = false,
  hidden = false,
  onToggleHidden,
  onDelete,
  error,
  nodeId,
  className,
  messages = defaultMessages,
}: DesignSelectionBarProps) {
  const text = messages.design.bar
  const names = messages.design.displays
  const bar = useRef<HTMLDivElement>(null)

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // The layout menu is a portal whose keys still bubble here: its ← → are not the bar's.
    if (!event.currentTarget.contains(event.target as Node)) return
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
    <div className="flex flex-col items-end gap-1">
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

        {onDuplicate ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={format(text.duplicate, { name: label })}
            title={`${format(text.duplicate, { name: label })} (Ctrl+D)`}
            aria-keyshortcuts={SHORTCUT.duplicate}
            disabled={duplicating}
            onClick={onDuplicate}
          >
            <CopyPlusIcon aria-hidden="true" />
          </Button>
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
      {error ? (
        <p role="alert" className="bg-background text-destructive border-destructive/40 max-w-64 rounded-md border px-2 py-1 text-xs shadow-sm">
          {error}
        </p>
      ) : null}
    </div>
  )
}
