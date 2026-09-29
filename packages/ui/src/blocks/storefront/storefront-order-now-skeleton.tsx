/** The order on its way while it is read: its lines, its two buttons and its row of steps, as grey shapes. */
export function StorefrontOrderNowSkeleton() {
  return (
    <div aria-hidden="true" className="flex animate-pulse flex-col gap-5 rounded-2xl border border-shop-line p-5 shop-md:p-6">
      <div className="flex flex-col gap-4 shop-md:flex-row shop-md:items-start">
        <div className="flex flex-1 flex-col gap-2">
          <div className="h-3 w-44 rounded bg-shop-fill" />
          <div className="h-7 w-56 rounded bg-shop-fill" />
          <div className="h-4 w-72 max-w-full rounded bg-shop-fill" />
        </div>
        <div className="flex flex-col gap-2 shop-sm:flex-row">
          <div className="h-11 w-44 rounded-full bg-shop-fill" />
          <div className="h-11 w-44 rounded-full bg-shop-fill" />
        </div>
      </div>
      <div className="flex flex-col gap-4 shop-md:flex-row">
        {[0, 1, 2, 3, 4].map((step) => (
          <div key={step} className="flex flex-1 items-center gap-2 shop-md:flex-col shop-md:items-start">
            <div className="size-[22px] shrink-0 rounded-full bg-shop-fill" />
            <div className="h-3 w-24 rounded bg-shop-fill" />
          </div>
        ))}
      </div>
    </div>
  )
}
