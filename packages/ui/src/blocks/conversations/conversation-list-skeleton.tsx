/** The conversations while they are read: rows of grey shapes, as the list draws them. */
export function ConversationListSkeleton() {
  return (
    <div aria-hidden="true" className="divide-border flex animate-pulse flex-col divide-y">
      {[0, 1, 2, 3].map((row) => (
        <div key={row} className="flex gap-3 px-3 py-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="bg-muted h-4 w-32 rounded" />
            <div className="bg-muted h-3 w-24 rounded" />
            <div className="bg-muted h-4 w-56 max-w-full rounded" />
          </div>
          <div className="bg-muted h-3 w-12 rounded" />
        </div>
      ))}
    </div>
  )
}
