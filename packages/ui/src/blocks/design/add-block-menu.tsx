"use client"

// Libs
import {
  BadgeCheckIcon,
  HeadingIcon,
  ImageIcon,
  MegaphoneIcon,
  PlusIcon,
  TagsIcon,
  TypeIcon,
} from "lucide-react"

// UI
import { buttonVariants } from "@harness-monorepo/ui/components/button"
import { cn } from "@harness-monorepo/ui/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@harness-monorepo/ui/components/dropdown-menu"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { ComponentKind } from "./design-types"

/**
 * The kinds a shopkeeper adds from here.
 *
 * A banner is on this list now, and its absence was the bug: it used to be made on a screen of its
 * own, so the one thing the owner most wanted to add was the one thing this menu would not add —
 * and a top banner could exist in design mode and be missing from its own list, because there were
 * two screens for one thing. Every kind is created empty and filled in place.
 *
 * The product rails are missing because there is exactly one of them and it already exists.
 *
 * A heading and a paragraph are two entries and not one with a mode, which is what was asked for:
 * "ao adicionar bloco de texto, tem que escolher se é título, subtítulo ou parágrafo". A form with
 * a mode is two forms wearing one name.
 */
const ADDABLE = [
  { kind: "BANNER", icon: ImageIcon },
  { kind: "HEADING", icon: HeadingIcon },
  { kind: "TEXT", icon: TypeIcon },
  { kind: "BENEFITS", icon: BadgeCheckIcon },
  { kind: "CATEGORIES", icon: TagsIcon },
  { kind: "ANNOUNCEMENT", icon: MegaphoneIcon },
] as const satisfies readonly { kind: ComponentKind; icon: typeof TypeIcon }[]

export interface AddBlockMenuProps {
  /** The kinds the shop already has one of, so a singleton is offered once. */
  taken?: readonly ComponentKind[]
  onAdd: (kind: ComponentKind) => void
  pending?: boolean
  messages?: UiMessages
}

export function AddBlockMenu({ taken = [], onAdd, pending = false, messages = defaultMessages }: AddBlockMenuProps) {
  const text = messages.design
  const offered = ADDABLE.filter((entry) => !taken.includes(entry.kind))

  if (!offered.length) return null

  return (
    <DropdownMenu>
      {/* The trigger is the button, not a wrapper around one: this primitive takes no `asChild`,
          which is how `admin-store-menu.tsx` already uses it. */}
      <DropdownMenuTrigger
        disabled={pending}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "w-full",
        )}
      >
        <PlusIcon aria-hidden="true" className="size-4" />
        {text.addBlock}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        {offered.map(({ kind, icon: Icon }) => (
          <DropdownMenuItem key={kind} onClick={() => onAdd(kind)}>
            <Icon aria-hidden="true" className="size-4" />
            {text.kinds[kind]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
