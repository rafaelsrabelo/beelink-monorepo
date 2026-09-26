// Libs
import {
  BadgeCheckIcon,
  HeadingIcon,
  ImageIcon,
  LayoutGridIcon,
  MailIcon,
  MegaphoneIcon,
  MessageCircleQuestionMarkIcon,
  TagsIcon,
  TypeIcon,
} from "lucide-react"

// Block
import type { ComponentKind } from "./design-types"

/**
 * The picture a row shows beside the title, or the glyph that stands in for one.
 *
 * Most kinds have no picture, and a blank grey rectangle beside each of them makes a
 * list of components read as a list of broken images.
 */
const KIND_ICON: Record<ComponentKind, typeof LayoutGridIcon> = {
  ANNOUNCEMENT: MegaphoneIcon,
  BANNER: ImageIcon,
  HEADING: HeadingIcon,
  TEXT: TypeIcon,
  BENEFITS: BadgeCheckIcon,
  CATEGORIES: TagsIcon,
  PRODUCTS: LayoutGridIcon,
  CONTACT: MailIcon,
  FAQ: MessageCircleQuestionMarkIcon,
}

/** A block's thumbnail on its row or its card: a banner's first picture, or its kind's glyph. */
export function RowThumbnail({ kind, imageUrl }: { kind: ComponentKind; imageUrl?: string | null }) {
  const KindIcon = KIND_ICON[kind]

  return (
    <span className="bg-muted text-muted-foreground flex h-9 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md">
      {imageUrl ? (
        <img src={imageUrl} alt="" aria-hidden="true" className="size-full object-cover" />
      ) : (
        <KindIcon aria-hidden="true" className="size-4" />
      )}
    </span>
  )
}
