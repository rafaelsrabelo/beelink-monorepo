// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface StorefrontCategoryArtProps {
  /** The category's name: never drawn, and what the link answers to. */
  name: string
  imageUrl: string
  href: string
  linkComponent?: LinkComponent
}

/**
 * One category as its artwork alone: a square of the picture, the whole of it the link, and nothing
 * written over or under it — the artwork already carries its words, and a name beside it is the
 * name said twice.
 *
 * The name is the picture's `alt`, and so the link's name: a screen reader hears the category, and a
 * picture that fails to load leaves its name in the square instead of a hole. The opposite of the
 * card with a name, whose photograph is decorative because the name sits under it.
 *
 * The frame is square whatever the file is, and the picture covers it: the recommended file is a
 * square, and one that is not loses its edges rather than leaving bars.
 */
export function StorefrontCategoryArt({ name, imageUrl, href, linkComponent: Link = AnchorLink }: StorefrontCategoryArtProps) {
  return (
    <Link
      href={href}
      className="group block aspect-square w-full overflow-hidden rounded-xl bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shop-primary-ink"
    >
      <img
        src={imageUrl}
        alt={name}
        loading="lazy"
        className="size-full object-cover transition-transform motion-safe:group-hover:scale-105"
      />
    </Link>
  )
}
