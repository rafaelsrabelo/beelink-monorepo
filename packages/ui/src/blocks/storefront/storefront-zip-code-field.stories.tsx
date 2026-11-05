import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontZipCodeField, type StorefrontZipCodeLookup } from "./storefront-zip-code-field"

const INPUT = "h-11 w-full rounded-[10px] border border-shop-line-strong bg-shop-background px-3 text-base text-shop-on-background"

const meta = {
  title: "Blocos/Vitrine/CEP",
  component: StorefrontZipCodeField,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), maxWidth: 360 }}>{Story()}</div>],
  args: {
    defaultValue: null,
    inputClassName: INPUT,
    labelClassName: "text-sm font-medium",
    onFound: () => {},
    onLookup: async (): Promise<StorefrontZipCodeLookup> => ({ status: "found", street: "Rua Tibúrcio Cavalcante", neighborhood: "Meireles", city: "Fortaleza", state: "CE" }),
  },
} satisfies Meta<typeof StorefrontZipCodeField>

export default meta
type Story = StoryObj<typeof meta>

/** Digite 8 números: a busca roda sozinha. Com menos, sair do campo diz que o CEP é inválido. */
export const Padrao: Story = {}

/** CEP que o ViaCEP não conhece. */
export const NaoAchado: Story = { args: { onLookup: async (): Promise<StorefrontZipCodeLookup> => ({ status: "not-found" }) } }

/** O serviço de CEP fora do ar: o endereço é digitado. */
export const ForaDoAr: Story = { args: { onLookup: async (): Promise<StorefrontZipCodeLookup> => ({ status: "unavailable" }) } }

/** Um CEP já salvo, mascarado. */
export const Preenchido: Story = { args: { defaultValue: "60160230" } }

/** Sem busca: o CEP é só mais um campo. */
export const SemBusca: Story = { args: { onLookup: undefined } }
