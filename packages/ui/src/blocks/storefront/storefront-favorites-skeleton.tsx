/** Favoritos while it loads: the filters and a row of cards, as grey shapes. The order has none: it is a form. */
export function StorefrontFavoritesSkeleton() {
  return (
    <div aria-hidden="true" className="flex animate-pulse flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        {[0, 1, 2, 3].map((filter) => (
          <div key={filter} className="h-9 w-32 rounded-full bg-shop-fill" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 shop-md:grid-cols-3 shop-lg:grid-cols-4">
        {[0, 1, 2, 3].map((card) => (
          <div key={card} className="overflow-hidden rounded-xl border border-shop-line">
            <div className="aspect-[259/190] bg-shop-fill" />
            <div className="flex flex-col gap-2 p-3.5">
              <div className="h-4 w-4/5 rounded bg-shop-fill" />
              <div className="h-3 w-1/3 rounded bg-shop-fill" />
              <div className="h-6 w-1/2 rounded bg-shop-fill" />
              <div className="mt-2 h-[42px] rounded-full bg-shop-fill" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
