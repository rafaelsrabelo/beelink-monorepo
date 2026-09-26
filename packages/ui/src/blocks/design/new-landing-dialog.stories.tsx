// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { fn } from "storybook/test"

// Block
import { LANDING_TEMPLATES } from "./landing-template-picker"
import { emptyNewLanding, NewLandingDialog, type NewLandingValue } from "./new-landing-dialog"

const products = [
  { id: "p1", name: "Whey Baunilha 900 g" },
  { id: "p2", name: "Creatina 300 g" },
  { id: "p3", name: "Pré-treino Molotov" },
]

const meta = {
  title: "Blocks/Design/NewLandingDialog",
  component: NewLandingDialog,
  args: {
    open: true,
    onOpenChange: fn(),
    value: emptyNewLanding("lancamento"),
    onChange: fn(),
    addressPrefix: "/mutante/lp/",
    addressState: "idle",
    templates: LANDING_TEMPLATES,
    products,
    productsState: "ready",
    onSubmit: fn(),
    pending: false,
  },
  render: function Controlled(args) {
    const [value, setValue] = useState<NewLandingValue>(args.value)
    return <NewLandingDialog {...args} value={value} onChange={setValue} />
  },
} satisfies Meta<typeof NewLandingDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Vazio: Story = {}

export const Preenchido: Story = {
  args: {
    value: { ...emptyNewLanding("lancamento"), title: "Lançamento Whey Baunilha", productId: "p1", inMenu: true },
    addressState: "available",
  },
}

export const EnderecoOcupado: Story = {
  args: { value: { ...emptyNewLanding("em-branco"), title: "Ofertas" }, addressState: "taken" },
}
