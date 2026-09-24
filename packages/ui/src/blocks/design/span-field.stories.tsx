import { useState } from "react"

import type { Meta, StoryObj } from "@storybook/react-vite"

import type { StorefrontSpan } from "../storefront/storefront-band-cell"
import { SpanField } from "./span-field"

const meta = {
  title: "Blocos/Design/Largura do bloco",
  component: SpanField,
  parameters: { layout: "padded" },
  args: { value: "HALF", onChange: () => {}, name: "Frete grátis", bandWidth: "CONTAINED" },
  render: (args) => {
    const [value, setValue] = useState<StorefrontSpan>(args.value)
    return (
      // The panel's real width: the control has to fit beside nothing wider than this.
      <div style={{ width: 340 }}>
        <SpanField {...args} value={value} onChange={setValue} />
      </div>
    )
  },
} satisfies Meta<typeof SpanField>

export default meta
type Story = StoryObj<typeof meta>

/** Metade, numa faixa dentro da margem. */
export const Metade: Story = {}

/** Dois terços, numa faixa de ponta a ponta. */
export const DoisTercos: Story = { args: { value: "TWO_THIRDS", bandWidth: "FULL" } }

/** Sem a largura da faixa, onde ela não é conhecida. */
export const SemFaixa: Story = { args: { value: "FULL", bandWidth: undefined } }
