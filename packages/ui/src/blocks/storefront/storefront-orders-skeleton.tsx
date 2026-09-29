/** The list while it loads: the tabs and two cards, as grey shapes. The toolbar has its own, in the header. */
export function StorefrontOrdersSkeleton() {
  return (
    <div aria-hidden="true" className="flex animate-pulse flex-col gap-4">
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((tab) => (
          <div key={tab} className="h-9 w-28 rounded-full bg-shop-fill" />
        ))}
      </div>
      {[0, 1].map((card) => (
        <div key={card} className="overflow-hidden rounded-2xl border border-shop-line">
          <div className="h-16 bg-shop-fill" />
          <div className="flex flex-col gap-3 p-5">
            <div className="h-5 w-64 rounded bg-shop-fill" />
            <div className="flex gap-3">
              <div className="size-14 rounded-[10px] bg-shop-fill" />
              <div className="flex flex-1 flex-col gap-2">
                <div className="h-4 w-2/3 rounded bg-shop-fill" />
                <div className="h-3 w-1/3 rounded bg-shop-fill" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
