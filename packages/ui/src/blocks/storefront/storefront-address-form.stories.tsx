import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontAddressForm, type StorefrontZipCodeLookup } from "./storefront-address-form"

const blank = { id: null, label: null, recipientName: null, zipCode: null, street: null, number: null, complement: null, neighborhood: null, city: null, state: null }

const meta = {
  title: "Blocos/Vitrine/Endereço",
  component: StorefrontAddressForm,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={shopPaletteStyle(sampleColorPresets[2]!.colors)}>{Story()}</div>],
  args: {
    address: blank,
    shopperName: "Rafael Souza",
    action: "#",
    cancelHref: "#",
    offerDefault: true,
    onZipCodeLookup: async (): Promise<StorefrontZipCodeLookup> => ({ status: "found", street: "Rua Tibúrcio Cavalcante", neighborhood: "Meireles", city: "Fortaleza", state: "CE" }),
  },
} satisfies Meta<typeof StorefrontAddressForm>

export default meta
type Story = StoryObj<typeof meta>

/** Um endereço novo: "Buscar CEP" preenche rua, bairro, cidade e UF. */
export const Novo: Story = {}

/** Editando o padrão: não há o que tornar padrão. */
export const Editando: Story = {
  args: {
    offerDefault: false,
    address: { ...blank, id: "casa", label: "Casa", zipCode: "60160-230", street: "Rua Tibúrcio Cavalcante", number: "1200", complement: "apto 302", neighborhood: "Meireles", city: "Fortaleza", state: "CE" },
  },
}

/** CEP que o ViaCEP não conhece: a pessoa preenche o resto. */
export const CepDesconhecido: Story = { args: { onZipCodeLookup: async (): Promise<StorefrontZipCodeLookup> => ({ status: "not-found" }) } }

/** Sem script ou sem busca de CEP: tudo digitado. */
export const SemBusca: Story = { args: { onZipCodeLookup: undefined } }

/** Recusado pela loja. */
export const Recusado: Story = { args: { error: "Confira o endereço: o CEP com 8 números, a rua, a cidade e a UF com 2 letras." } }
