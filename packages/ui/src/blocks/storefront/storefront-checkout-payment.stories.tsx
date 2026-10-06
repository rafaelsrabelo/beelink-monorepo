import { useState } from "react"

import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontCheckoutPayment, type StorefrontCheckoutOnline, type StorefrontCheckoutPaymentProps, type StorefrontCheckoutPaymentValue } from "./storefront-checkout-payment"

const ONLINE: StorefrontCheckoutOnline = {
  methods: ["PIX", "CREDIT_CARD"],
  unavailable: null,
  installments: [
    { count: 1, label: "1x de R$ 120,00 (à vista)" },
    { count: 2, label: "2x de R$ 60,00 sem juros" },
    { count: 3, label: "3x de R$ 40,00 sem juros" },
  ],
  note: null,
  document: null,
}

function Held(props: Omit<StorefrontCheckoutPaymentProps<StorefrontCheckoutPaymentValue>, "onChange">) {
  const [value, setValue] = useState(props.value)
  const [cpf, setCpf] = useState("")
  const online = props.online?.document ? { ...props.online, document: { value: cpf, onChange: setCpf } } : props.online
  return <StorefrontCheckoutPayment {...props} online={online} value={value} onChange={setValue} />
}

const meta = {
  title: "Blocos/Vitrine/Checkout · pagamento",
  component: StorefrontCheckoutPayment,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), maxWidth: 380 }}>{Story()}</div>],
  render: (args) => <Held {...args} />,
  args: { value: { paymentMethod: null }, onChange: () => {}, offlineMethods: ["MONEY", "PIX", "DEBIT_CARD"], online: ONLINE },
} satisfies Meta<typeof StorefrontCheckoutPayment>

export default meta
type Story = StoryObj<typeof meta>

/** Pagar agora, com Pix ou cartão, ao lado das formas combinadas com a loja. */
export const OnlineEOffline: Story = {}

/** O cartão escolhido: as parcelas, cada uma com o seu valor, sem juros. */
export const CartaoParcelado: Story = { args: { value: { paymentChannel: "ONLINE", paymentMethod: "CREDIT_CARD", installments: 3 } } }

/** A loja desligou o pagar na entrega: só as formas online. */
export const SoOnline: Story = { args: { offlineMethods: [] } }

/** O cadastro não tem CPF: ele é pedido ao escolher uma forma online. */
export const PedeCpf: Story = { args: { value: { paymentChannel: "ONLINE", paymentMethod: "PIX" }, online: { ...ONLINE, document: { value: "", onChange: () => {} } } } }

/** Total abaixo do mínimo: as formas online ficam desligadas, com a frase que diz por quê. */
export const AbaixoDoMinimo: Story = { args: { online: { ...ONLINE, installments: [], unavailable: "O pagamento online vale para pedidos a partir de R$ 5,00." } } }

/** Frete a combinar: o cliente escolhe online e é avisado de que paga depois. */
export const FreteACombinar: Story = {
  args: {
    value: { paymentChannel: "ONLINE", paymentMethod: "PIX" },
    online: { ...ONLINE, note: "O frete deste pedido é a combinar. Você paga depois que a loja informar o frete: o pagamento fica disponível no pedido." },
  },
}

/** O desconto cobre o pedido inteiro: nada é perguntado. */
export const NadaAPagar: Story = { args: { nothingToPay: "Nada a pagar: o desconto cobre o pedido inteiro." } }

/** A loja não cobra online: as formas de sempre. */
export const SemOnline: Story = { args: { online: null } }
