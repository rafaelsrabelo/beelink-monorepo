"use client"

// UI
import { StorefrontAddressForm, type StorefrontAddressFormProps } from "@harness-monorepo/ui/blocks/storefront/storefront-address-form"

// App
import { useShopperZipCodeLookup } from "@/services/cep/cep-hooks"

export type StorefrontAddressEditorProps = Omit<StorefrontAddressFormProps, "onZipCodeLookup" | "linkComponent"> & { slug: string }

/** The address form at a shop, with "Buscar CEP" through the shop's own lane; the page draws it on the server. */
export function StorefrontAddressEditor({ slug, ...form }: StorefrontAddressEditorProps) {
  const lookup = useShopperZipCodeLookup(slug)

  return <StorefrontAddressForm {...form} onZipCodeLookup={lookup} />
}
