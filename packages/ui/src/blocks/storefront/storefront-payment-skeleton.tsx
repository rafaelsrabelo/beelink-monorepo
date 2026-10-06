/** The payment while it is read: the card of a Pix — a title, the amount, the code's square, its line — as grey shapes. */
export function StorefrontPaymentSkeleton() {
  return (
    <div aria-hidden="true" className="flex animate-pulse flex-col gap-4 rounded-2xl border border-shop-line p-5 shop-md:p-7">
      <div className="h-5 w-40 rounded bg-shop-fill" />
      <div className="h-4 w-full rounded bg-shop-fill" />
      <div className="flex items-center gap-3">
        <div className="h-4 w-12 rounded bg-shop-fill" />
        <div className="ml-auto h-8 w-28 rounded bg-shop-fill" />
      </div>
      <div className="size-[220px] self-center rounded-[10px] bg-shop-fill" />
      <div className="h-3 w-32 rounded bg-shop-fill" />
      <div className="h-16 w-full rounded-[10px] bg-shop-fill" />
      <div className="h-4 w-48 rounded bg-shop-fill" />
    </div>
  )
}
