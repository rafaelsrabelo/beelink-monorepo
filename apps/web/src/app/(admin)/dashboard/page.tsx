// Next
import { redirect } from "next/navigation"

/**
 * There is no account-wide dashboard, and there should not be one.
 *
 * A shopkeeper is always inside one shop: they sign in, pick which, and every screen from then on
 * belongs to it. A page of figures spanning every shop they own is a view of a thing this product
 * has no notion of — and it was the last place in the panel that pretended otherwise.
 *
 * It stays as a redirect rather than disappearing, because it is the address the legacy served,
 * the one this panel served before, and the one a bookmark still holds.
 */
export default function DashboardPage() {
  redirect("/admin")
}
