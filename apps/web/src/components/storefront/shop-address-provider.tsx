"use client"

// React
import { createContext, useContext, useMemo, type ReactNode } from "react"

// App
import type { ShopAddress } from "@/lib/shop-address"

const OwnDomainContext = createContext(false)

export interface ShopAddressProviderProps {
  /** Whether this page's request arrived by the shop's own domain, as `shopAt` read it from the proxy's stamp. */
  ownDomain: boolean
  children: ReactNode
}

/**
 * Where the shop's pages are, for the components that run in the browser (BEELINK-283). They are
 * handed a slug and nothing of the request, and two things they do depend on it: the addresses they
 * spell and the path of the cookies they write.
 *
 * The shop's layout provides it once. Outside it — the panel's design preview draws the same
 * blocks — the answer is the platform's host, which is where the panel is.
 */
export function ShopAddressProvider({ ownDomain, children }: ShopAddressProviderProps) {
  return <OwnDomainContext value={ownDomain}>{children}</OwnDomainContext>
}

/** The shop as this page's request reached it, from its slug alone. */
export function useShopAddress(slug: string): ShopAddress {
  const ownDomain = useContext(OwnDomainContext)

  return useMemo(() => ({ slug, ownDomain }), [slug, ownDomain])
}
