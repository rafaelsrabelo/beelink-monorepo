export interface StorefrontCategoryBannerProps {
  imageUrl: string
}

/**
 * The wide picture a category's own page opens with, between the trail and the title.
 *
 * One proportion at every width, 4:1, for the reason `storefront-span-shape.ts` records about the
 * home's banners: the file is artwork with its words painted in, made once at one size, and a frame
 * that changed shape with the screen would cut on a phone what it showed on a monitor. 4:1 and not
 * lower, because at 390px it is the least height — about 90px — at which those words still read.
 * The file to make is 1600 × 400 px; one of another shape is covered, and loses the same edges on
 * every screen.
 *
 * The frame holds the proportion before the file arrives, so the title under it does not jump, and
 * the picture is asked for at once: it is the first thing on the page, above the fold.
 *
 * Decorative: the page's `h1`, right under it, names the category, and an `alt` repeating it would
 * be the name read twice.
 */
export function StorefrontCategoryBanner({ imageUrl }: StorefrontCategoryBannerProps) {
  return (
    <div className="aspect-[4/1] w-full overflow-hidden rounded-2xl bg-shop-fill">
      <img src={imageUrl} alt="" loading="eager" fetchPriority="high" decoding="async" className="size-full object-cover" />
    </div>
  )
}
