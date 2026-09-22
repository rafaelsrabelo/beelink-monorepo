"use client"

// Libs
import { BadgeCheckIcon, MegaphoneIcon, PlusIcon, TagsIcon, TypeIcon } from "lucide-react"

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
import type { SectionKind } from "./design-types"

/**
 * The kinds a shopkeeper adds from here, and the ones they do not.
 *
 * A banner is missing on purpose: it has a picture, a destination and a shape to choose, which is
 * a form and not a menu item — it is made on the Banners screen, and lands in the arrangement. The
 * product rails are missing because there is exactly one of them and it already exists.
 *
 * Everything here is a block whose whole content is text the shopkeeper types, which is why it can
 * be created empty and filled in place.
 */
const ADDABLE = [
  { kind: "TEXT", icon: TypeIcon },
  { kind: "BENEFITS", icon: BadgeCheckIcon },
  { kind: "CATEGORIES", icon: TagsIcon },
  { kind: "ANNOUNCEMENT", icon: MegaphoneIcon },
] as const satisfies readonly { kind: SectionKind; icon: typeof TypeIcon }[]

export interface AddBlockMenuProps {
  /** The kinds the shop already has one of, so a singleton is offered once. */
  taken?: readonly SectionKind[]
  onAdd: (kind: SectionKind) => void
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
