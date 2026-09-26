// Libs
import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { CountdownFields } from "./countdown-fields"

const meta = {
  title: "Blocos/Modo design/Contagem regressiva",
  component: CountdownFields,
  parameters: { layout: "padded" },
  args: { value: "2026-09-30T23:59", onChange: () => {} },
  render: function Render(args) {
    const [value, setValue] = useState(args.value)
    return <CountdownFields {...args} value={value} onChange={setValue} />
  },
} satisfies Meta<typeof CountdownFields>

export default meta
type Story = StoryObj<typeof meta>

/** A data e a hora de término, no relógio da loja. */
export const Padrao: Story = {}

export const SemData: Story = { args: { value: "" } }
