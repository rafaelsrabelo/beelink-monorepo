import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontAccountForm } from "./storefront-account-form"

const meta = {
  title: "Blocos/Vitrine/Minha conta",
  component: StorefrontAccountForm,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), backgroundColor: "var(--shop-canvas)", padding: 24 }}>{Story()}</div>],
  args: {
    action: "#",
    signOutAction: "#",
    profile: {
      name: "Bia Cliente",
      email: "bia@exemplo.com",
      phone: null,
      cpf: null,
      birthDate: null,
      address: { zipCode: null, street: null, number: null, complement: null, neighborhood: null, city: null, state: null },
    },
  },
} satisfies Meta<typeof StorefrontAccountForm>

export default meta
type Story = StoryObj<typeof meta>

/** A primeira visita: só o nome e o e-mail da conta. */
export const Nova: Story = {}

export const Salvo: Story = { args: { saved: true } }

/** Tudo preenchido: o CPF escrito como a pessoa escreve, e a data no campo do navegador. */
export const Completo: Story = {
  args: {
    saved: true,
    profile: {
      name: "Bia Cliente",
      email: "bia@exemplo.com",
      phone: "(11) 98888-7777",
      cpf: "529.982.247-25",
      birthDate: "1990-05-17",
      address: { zipCode: "01310-930", street: "Av. Paulista", number: "1000", complement: null, neighborhood: "Bela Vista", city: "São Paulo", state: "SP" },
    },
  },
}

/** Um CPF cujos dígitos verificadores não batem volta com a frase dele, e não com "confira os campos". */
export const CpfRecusado: Story = { args: { error: "Esse CPF não confere. Confira os números e salve de novo." } }
