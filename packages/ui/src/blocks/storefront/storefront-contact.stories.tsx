// React
import type { CSSProperties } from "react"

// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { StorefrontContact, type StorefrontContactField } from "./storefront-contact"

const fields: StorefrontContactField[] = [
  { id: "email", label: "E-mail", type: "EMAIL", required: true },
  { id: "telefone", label: "Telefone", type: "PHONE", required: true },
  { id: "volume", label: "Volume por semana", type: "SELECT", required: false, options: ["Até 10t", "De 10 a 50t", "Mais de 50t"] },
  { id: "mensagem", label: "O que você precisa?", type: "TEXTAREA", required: true },
]

const meta = {
  title: "Blocos/Vitrine/Formulário de contato",
  component: StorefrontContact,
  args: { title: "Fale com a gente", subtitle: "Respondemos em até um dia útil.", fields, whatsappHref: "https://wa.me/5591999998888", onSubmit: () => {} },
  decorators: [
    (Story) => (
      <div style={{ "--shop-primary": "oklch(0.35 0.08 250)", "--shop-on-primary": "oklch(0.98 0 0)", padding: 24 } as CSSProperties}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StorefrontContact>

export default meta
type Story = StoryObj<typeof meta>

/** O formulário ao lado do WhatsApp. O nome é sempre pedido primeiro. */
export const Padrao: Story = {}

export const Enviando: Story = { args: { status: "sending" } }

/** Enviado: o formulário some, para não ir duas vezes. */
export const Enviado: Story = { args: { status: "sent" } }

export const ComErro: Story = { args: { error: "Confira os campos e tente de novo." } }

/** No modo design: desenha tudo e não envia nada. */
export const NoPreview: Story = { args: { onSubmit: undefined } }
