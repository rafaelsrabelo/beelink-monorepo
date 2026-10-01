export interface StorefrontOverviewSkeletonProps {
  /** The purchases to rate, as cards in two columns; or the favourites, as a row of tiles. */
  kind: "reviews" | "favorites"
}

/** A part of the account's front while it is read: its heading and its cards or tiles, as grey shapes. */
export function StorefrontOverviewSkeleton({ kind }: StorefrontOverviewSkeletonProps) {
  return (
    <div aria-hidden="true" className="flex animate-pulse flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <div className="h-5 w-48 rounded bg-shop-fill" />
        <div className="h-3.5 w-72 max-w-full rounded bg-shop-fill" />
      </div>
      {kind === "reviews" ? (
        <div className="grid grid-cols-1 gap-3 shop-md:grid-cols-2">
          {[0, 1].map((card) => (
            <div key={card} className="flex gap-4 rounded-2xl border border-shop-line p-4">
              <div className="size-[72px] shrink-0 rounded-[10px] bg-shop-fill" />
              <div className="flex flex-1 flex-col gap-2">
                <div className="h-4 w-40 rounded bg-shop-fill" />
                <div className="h-3 w-28 rounded bg-shop-fill" />
                <div className="h-9 w-44 rounded bg-shop-fill shop-sm:h-11" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-hidden">
          {[0, 1, 2, 3, 4].map((tile) => (
            <div key={tile} className="flex w-40 shrink-0 flex-col gap-1.5">
              <div className="aspect-square rounded-xl bg-shop-fill" />
              <div className="h-3.5 w-32 rounded bg-shop-fill" />
              <div className="h-3.5 w-16 rounded bg-shop-fill" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
