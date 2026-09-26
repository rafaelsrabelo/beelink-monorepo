// Libs
import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { StorefrontDeliverTo } from "./storefront-deliver-to"

const meta = {
  title: "Blocos/Vitrine/Entregar em",
  component: StorefrontDeliverTo,
  parameters: { layout: "padded" },
  args: { cep: null, onSave: () => {} },
  render: function Render(args) {
    const [cep, setCep] = useState(args.cep)
    return (
      <div style={{ background: "var(--shop-header)", color: "var(--shop-on-header)", padding: 16, minHeight: 280 }}>
        <StorefrontDeliverTo {...args} cep={cep} {...(args.onSave ? { onSave: setCep } : {})} />
      </div>
    )
  },
} satisfies Meta<typeof StorefrontDeliverTo>

export default meta
type Story = StoryObj<typeof meta>

/** Sem CEP: o convite. Guarda o CEP e não promete prazo nem valor — ainda não há cotação de frete. */
export const SemCep: Story = {}

/** Com o CEP guardado. */
export const ComCep: Story = { args: { cep: "01310930" } }

/** Na prévia do modo design: desenhado e inerte. */
export const Inerte: Story = { args: { onSave: undefined } }
