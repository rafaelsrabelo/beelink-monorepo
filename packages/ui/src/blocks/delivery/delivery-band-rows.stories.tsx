import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { DeliveryBandRows } from "./delivery-band-rows"
import { sampleDeliveryPreviews, sampleDeliveryValues } from "./delivery.fixtures"

const meta = {
  title: "Blocos/Entrega/Faixas de distância",
  component: DeliveryBandRows,
  parameters: { layout: "padded" },
  args: { rows: sampleDeliveryValues.bands, onChange: fn(), previews: sampleDeliveryPreviews },
} satisfies Meta<typeof DeliveryBandRows>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

export const Vazia: Story = { args: { rows: [], previews: [] } }

export const ComRecusa: Story = { args: { issues: { 0: "Faixa 1: preencha a distância, o frete e os dois tempos." }, previews: [] } }
