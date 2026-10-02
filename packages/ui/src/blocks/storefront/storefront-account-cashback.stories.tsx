import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontAccountCashback } from "./storefront-account-cashback"

const meta = {
  title: "Blocos/Vitrine/Minha conta/Cashback",
  component: StorefrontAccountCashback,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), backgroundColor: "var(--shop-background)", color: "var(--shop-on-background)", padding: 20, maxWidth: 720 }}>
        {Story()}
      </div>
    ),
  ],
  args: {
    balance: "R$ 15,00",
    pending: "R$ 4,70",
    expiry: "R$ 5,00 vencem em 10/11/2026",
    rule: "Nesta loja, 5% do valor dos produtos volta como cashback quando o pedido é entregue.",
    credits: [
      { key: "c1", origin: "Pedido nº 12", amount: "R$ 5,00", left: null, when: "Vence em 10/11/2026" },
      { key: "c2", origin: "Crédito da loja", amount: "R$ 10,00", left: "Restam R$ 10,00 de R$ 20,00", when: "Não vence" },
      { key: "c3", origin: "Pedido nº 15", amount: "R$ 4,70", left: null, when: "Liberado quando o pedido for entregue" },
    ],
    entries: [
      { key: "e1", label: "Usado", detail: "Pedido nº 14", amount: "− R$ 10,00", positive: false, date: "2 de out. de 2026" },
      { key: "e2", label: "Ajuste da loja", detail: null, amount: "+ R$ 20,00", positive: true, date: "1 de out. de 2026" },
      { key: "e3", label: "Ganho", detail: "Pedido nº 12", amount: "+ R$ 5,00", positive: true, date: "1 de out. de 2026" },
    ],
  },
} satisfies Meta<typeof StorefrontAccountCashback>

export default meta
type Story = StoryObj<typeof meta>

/** Saldo, pendente, os créditos e o extrato. */
export const ComSaldo: Story = {}

/** Ainda sem nada nesta loja, com o cashback ligado. */
export const Vazio: Story = { args: { balance: "R$ 0,00", pending: null, expiry: null, credits: [], entries: [] } }

/** A loja desligou o cashback: o saldo continua valendo, sem a frase da regra. */
export const CashbackDesligado: Story = { args: { rule: null, pending: null } }
