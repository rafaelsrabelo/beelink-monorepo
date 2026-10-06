// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { fn } from "storybook/test"

// Block
import { SHOP_LANDINGS } from "./landing-template.fixtures"
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
    templates: SHOP_LANDINGS,
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

/** A lista de modelos ainda não chegou: cartões cinza, e "Criar página" espera. */
export const ModelosCarregando: Story = { args: { value: { ...emptyNewLanding(), title: "Ofertas" }, templates: [], templatesState: "loading" } }

/** A lista de modelos não pôde ser lida. */
export const ModelosFalharam: Story = {
  args: { value: { ...emptyNewLanding(), title: "Ofertas" }, templates: [], templatesState: "failed", onRetryTemplates: fn() },
}
