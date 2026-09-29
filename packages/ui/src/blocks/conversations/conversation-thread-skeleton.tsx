/** One conversation while it is read: its head and a few messages on either side, as grey shapes. */
export function ConversationThreadSkeleton() {
  return (
    <div aria-hidden="true" className="flex animate-pulse flex-col gap-4 p-4">
      <div className="bg-muted h-5 w-40 rounded" />
      <div className="bg-muted h-14 w-3/4 self-start rounded-2xl" />
      <div className="bg-muted h-10 w-2/3 self-end rounded-2xl" />
      <div className="bg-muted h-14 w-3/4 self-start rounded-2xl" />
      <div className="bg-muted mt-2 h-[62px] w-full rounded-xl" />
    </div>
  )
}
