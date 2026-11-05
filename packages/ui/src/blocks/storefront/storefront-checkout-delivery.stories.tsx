import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontAddressForm, type StorefrontZipCodeLookup } from "./storefront-address-form"
import { StorefrontCheckoutDelivery, type StorefrontCheckoutAddressForm } from "./storefront-checkout-delivery"

const blank = { id: null, label: null, recipientName: null, zipCode: null, street: null, number: null, complement: null, neighborhood: null, city: null, state: null }

/** The compact form, as the cart draws it: the CEP first, and filled on its eighth digit. */
const addressForm: StorefrontCheckoutAddressForm = {
  draw: ({ autoFocus, onCancel }) => (
    <StorefrontAddressForm
      address={blank}
      shopperName="Bia Cliente"
      action="#"
      compact
      autoFocus={autoFocus}
      {...(onCancel ? { onCancel } : {})}
      offerDefault={false}
      onZipCodeLookup={async (): Promise<StorefrontZipCodeLookup> => ({ status: "found", street: "Rua Tibúrcio Cavalcante", neighborhood: "Meireles", city: "Fortaleza", state: "CE" })}
    />
  ),
}

const meta = {
  title: "Blocos/Vitrine/Entrega no checkout",
  component: StorefrontCheckoutDelivery,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), maxWidth: 360 }} className="flex flex-col gap-2">{Story()}</div>],
  args: {
    value: { fulfillment: "DELIVERY", addressId: null, paymentMethod: null, wayId: null },
    onChange: () => {},
    name: "receber",
    addresses: [],
    addHref: "#",
    addressForm: addressForm as StorefrontCheckoutAddressForm | null,
    shipping: null,
    recipientDocument: null,
  },
} satisfies Meta<typeof StorefrontCheckoutDelivery>

export default meta
type Story = StoryObj<typeof meta>

/** Entrega escolhida sem endereço salvo: o formulário abre ali mesmo, no checkout. */
export const SemEndereco: Story = {}

/** Com endereço salvo: "Entregar em outro endereço" abre o mesmo formulário, que "Cancelar" fecha. */
export const ComEndereco: Story = {
  args: {
    value: { fulfillment: "DELIVERY", addressId: "casa", paymentMethod: null, wayId: null },
    addresses: [{ id: "casa", heading: "Casa · Bia Cliente", line: "Av. Paulista, 1000 — Bela Vista — São Paulo/SP" }],
  },
}

/** Sem o formulário: o endereço é cadastrado fora do checkout, como antes. */
export const SemFormulario: Story = { args: { addressForm: null, value: { fulfillment: "PICKUP", addressId: null, paymentMethod: null, wayId: null } } }
