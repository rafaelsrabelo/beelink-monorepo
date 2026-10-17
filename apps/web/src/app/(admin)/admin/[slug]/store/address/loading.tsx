// UI
import { StoreAddressChangeSkeleton } from "@harness-monorepo/ui/blocks/store/store-address-change-skeleton"

/** The address screen's own skeleton, rather than the settings' one this segment would inherit. */
export default function StoreAddressLoading() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 lg:px-6">
      <StoreAddressChangeSkeleton />
    </div>
  )
}
