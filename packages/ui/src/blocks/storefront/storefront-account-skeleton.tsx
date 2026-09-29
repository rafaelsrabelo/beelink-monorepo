/** A tab of the shopper's area while its content is on its way: the shape of a card and its lines. */
export function StorefrontAccountSkeleton() {
  return (
    <div aria-hidden="true" className="flex animate-pulse flex-col gap-4">
      <div className="h-6 w-48 rounded-md bg-shop-fill" />
      <div className="flex flex-col gap-3 rounded-2xl border border-shop-line p-5">
        <div className="h-4 w-2/3 rounded bg-shop-fill" />
        <div className="h-4 w-1/2 rounded bg-shop-fill" />
        <div className="h-11 w-full rounded-[10px] bg-shop-fill" />
        <div className="h-11 w-full rounded-[10px] bg-shop-fill" />
      </div>
    </div>
  )
}
