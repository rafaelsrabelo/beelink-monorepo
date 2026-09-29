/** One conversation while it is read: its head and a few messages on either side, as grey shapes. */
export function StorefrontConversationThreadSkeleton() {
  return (
    <div aria-hidden="true" className="flex animate-pulse flex-col gap-4">
      <div className="h-5 w-32 rounded bg-shop-fill" />
      <div className="h-14 w-3/4 self-start rounded-2xl bg-shop-fill" />
      <div className="h-10 w-2/3 self-end rounded-2xl bg-shop-fill" />
      <div className="h-14 w-3/4 self-start rounded-2xl bg-shop-fill" />
      <div className="mt-2 h-[62px] w-full rounded-xl bg-shop-fill" />
    </div>
  )
}
