import { useState } from "react"

import type { Meta, StoryObj } from "@storybook/react-vite"

import type { ComponentDisplay } from "./design-types"
import { DisplayField } from "./display-field"

const meta = {
  title: "Blocos/Design/Formato do banner",
  component: DisplayField,
  parameters: { layout: "padded" },
  args: { value: "CAROUSEL", onChange: () => {} },
  render: (args) => {
    const [value, setValue] = useState<ComponentDisplay>(args.value)
    return <DisplayField {...args} value={value} onChange={setValue} />
  },
} satisfies Meta<typeof DisplayField>

export default meta
type Story = StoryObj<typeof meta>

/** Uma imagem por vez: o que todo banner era até o lojista poder escolher. */
export const Carrossel: Story = {}

/** Todas lado a lado, na célula do banner. */
export const Grade: Story = { args: { value: "GRID" } }
