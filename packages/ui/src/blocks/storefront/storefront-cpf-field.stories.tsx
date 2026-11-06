import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontCpfField } from "./storefront-cpf-field"

const meta = {
  title: "Blocos/Vitrine/Checkout · CPF",
  component: StorefrontCpfField,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), maxWidth: 360 }}>{Story()}</div>],
  args: { label: "Seu CPF", hint: "O pagamento online é feito no seu CPF. Ele fica guardado no seu cadastro, e só é pedido uma vez.", value: "", onChange: () => {} },
  render: function Render(args) {
    const [value, setValue] = useState(args.value)
    return <StorefrontCpfField {...args} value={value} onChange={setValue} />
  },
} satisfies Meta<typeof StorefrontCpfField>

export default meta
type Story = StoryObj<typeof meta>

/** Vazio: digite e a máscara 000.000.000-00 aparece enquanto se digita. */
export const Vazio: Story = {}

/** Um CPF válido, já com a máscara. */
export const Preenchido: Story = { args: { value: "529.982.247-25" } }

/** Onze dígitos que não formam um CPF: o aviso aparece na hora, embaixo do campo. */
export const Invalido: Story = { args: { value: "123.456.789-00" } }
