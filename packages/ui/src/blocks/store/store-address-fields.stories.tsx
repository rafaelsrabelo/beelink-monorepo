import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { en } from "../../locales/en"
import { StoreAddressFields } from "./store-address-fields"
import { sampleStoreSettingsValues } from "./store.fixtures"

const meta = {
  title: "Blocos/Loja/Aba endereço",
  component: StoreAddressFields,
  parameters: { layout: "padded" },
  args: {
    value: sampleStoreSettingsValues.address,
    onChange: fn(),
    onZipCodeLookup: fn(async () => null),
  },
} satisfies Meta<typeof StoreAddressFields>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

/** The screen is asking the CEP service; the button says so instead of a spinner appearing. */
export const BuscandoCep: Story = {
  args: { lookupPending: true },
}

/** No lookup wired up — the fields are still fillable by hand. */
export const SemBuscaDeCep: Story = {
  args: { onZipCodeLookup: undefined },
}

export const ComErros: Story = {
  args: {
    value: { ...sampleStoreSettingsValues.address, zipCode: "123", state: "São Paulo" },
    errors: {
      zipCode: { message: "Informe um CEP com 8 dígitos" },
      state: { message: "Informe a UF com 2 letras, como SP" },
    },
  },
}

export const EmIngles: Story = {
  args: { messages: en },
}
