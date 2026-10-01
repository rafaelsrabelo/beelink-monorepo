/** The product's reviews while they load: the summary's column and two reviews, as grey shapes. */
export function StorefrontProductReviewsSkeleton() {
  return (
    <div aria-hidden="true" className="flex animate-pulse flex-col gap-8 border-t border-shop-line pt-7 pb-12 shop-lg:flex-row shop-lg:gap-14">
      <div className="flex shrink-0 flex-col gap-3 shop-lg:w-[300px]">
        <div className="h-6 w-56 rounded bg-shop-fill" />
        <div className="h-5 w-32 rounded bg-shop-fill" />
        {[0, 1, 2, 3, 4].map((row) => (
          <div key={row} className="h-[18px] rounded-[6px] bg-shop-fill" />
        ))}
      </div>
      <div className="flex grow flex-col gap-5">
        {[0, 1].map((review) => (
          <div key={review} className="flex flex-col gap-2">
            <div className="h-9 w-40 rounded bg-shop-fill" />
            <div className="h-4 w-24 rounded bg-shop-fill" />
            <div className="h-4 w-3/4 rounded bg-shop-fill" />
          </div>
        ))}
      </div>
    </div>
  )
}
