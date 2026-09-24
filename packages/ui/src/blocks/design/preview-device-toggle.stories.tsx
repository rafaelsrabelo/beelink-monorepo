// Libs
import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { PreviewDeviceToggle, type PreviewDevice } from "./preview-device-toggle"

const meta = {
  title: "Blocos/Modo design/Dispositivo do preview",
  component: PreviewDeviceToggle,
  parameters: { layout: "padded" },
  args: { value: "PHONE", onChange: () => {} },
  render: function Render(args) {
    const [value, setValue] = useState<PreviewDevice>(args.value)
    return <PreviewDeviceToggle {...args} value={value} onChange={setValue} />
  },
} satisfies Meta<typeof PreviewDeviceToggle>

export default meta
type Story = StoryObj<typeof meta>

/** Começa no celular, que é onde a loja vende. Tab chega no grupo; as setas trocam. */
export const Padrao: Story = {}
