/** Avaliar compras while it loads: a title and two products with their stars, as grey shapes. */
export function StorefrontReviewsSkeleton() {
  return (
    <div aria-hidden="true" className="flex animate-pulse flex-col gap-4">
      <div className="h-6 w-40 rounded bg-shop-fill" />
      {[0, 1].map((card) => (
        <div key={card} className="flex gap-4 rounded-2xl border border-shop-line p-4">
          <div className="size-[72px] shrink-0 rounded-[10px] bg-shop-fill" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-4 w-2/3 rounded bg-shop-fill" />
            <div className="h-3 w-1/3 rounded bg-shop-fill" />
            <div className="h-8 w-48 rounded bg-shop-fill" />
          </div>
        </div>
      ))}
    </div>
  )
}
