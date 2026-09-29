/** The conversations while they are read: three rows of grey shapes, as the list draws them. */
export function StorefrontConversationListSkeleton() {
  return (
    <div aria-hidden="true" className="flex animate-pulse flex-col divide-y divide-shop-line">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-start gap-3 px-2 py-3">
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-4 w-28 rounded bg-shop-fill" />
            <div className="h-4 w-56 max-w-full rounded bg-shop-fill" />
          </div>
          <div className="h-3 w-16 rounded bg-shop-fill" />
        </div>
      ))}
    </div>
  )
}
