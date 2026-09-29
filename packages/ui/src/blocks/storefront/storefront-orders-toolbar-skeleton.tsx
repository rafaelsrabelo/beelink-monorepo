/** The search, the period and the button while the list is read: the shapes of `StorefrontOrdersToolbar`, beside the title. */
export function StorefrontOrdersToolbarSkeleton() {
  return (
    <div aria-hidden="true" className="flex w-full animate-pulse gap-2 shop-md:w-auto">
      <div className="h-11 flex-1 rounded-[10px] bg-shop-fill shop-md:w-60 shop-md:flex-none" />
      <div className="h-11 w-36 rounded-[10px] bg-shop-fill" />
      <div className="h-11 w-20 rounded-[10px] bg-shop-fill" />
    </div>
  )
}
