export interface StorefrontAffiliateJoinPictureProps {
  url: string
}

/** The shop's own picture beside the page's title (plan 2026-11-14): decoration, the title says it all. */
export function StorefrontAffiliateJoinPicture({ url }: StorefrontAffiliateJoinPictureProps) {
  return <img src={url} alt="" className="aspect-[4/3] w-full rounded-2xl object-cover" />
}
