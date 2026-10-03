import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { DeliverySettingsForm } from "./delivery-settings-form"
import { sampleConnectedCarriers, sampleDeliveryMap, sampleDeliveryPreviews, sampleDeliveryValues } from "./delivery.fixtures"

const meta = {
  title: "Blocos/Entrega/Aba Entrega",
  component: DeliverySettingsForm,
  parameters: { layout: "padded" },
  args: {
    value: sampleDeliveryValues,
    onChange: fn(),
    onSubmit: fn(),
    previews: sampleDeliveryPreviews,
    pickupAddress: "Rua Augusta, 1500 — Consolação, São Paulo/SP",
    map: sampleDeliveryMap,
    carriers: sampleConnectedCarriers,
    connectHref: "#conectar",
    manageHref: "#integracoes",
  },
} satisfies Meta<typeof DeliverySettingsForm>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

/** Pickup only: the other cards keep their switch and show nothing else. */
export const SoRetirada: Story = {
  args: { value: { ...sampleDeliveryValues, ownDeliveryEnabled: false, carriersEnabled: false }, carriers: { ...sampleConnectedCarriers, status: "DISCONNECTED", accountName: null } },
}

/** Own delivery with no band yet: the fee is agreed afterwards, and the shop has no point on the map. */
export const SemFaixas: Story = {
  args: { value: { ...sampleDeliveryValues, bands: [], freeAbove: "" }, previews: [], map: { ...sampleDeliveryMap, point: null, radiusMeters: null } },
}

/** What the screen refuses before sending, said on the row and the field. */
export const ComRecusas: Story = {
  args: {
    value: { ...sampleDeliveryValues, bands: [sampleDeliveryValues.bands[1]!, sampleDeliveryValues.bands[0]!], freeAbove: "0" },
    previews: [],
    issues: { bands: { 1: "Faixa 2: a distância tem que ser maior que a da faixa 1." }, freeAbove: "Informe um valor maior que zero, ou deixe vazio." },
  },
}

/** Melhor Envio stopped accepting the connection. */
export const ReconectarMelhorEnvio: Story = {
  args: { carriers: { ...sampleConnectedCarriers, status: "NEEDS_RECONNECT" } },
}

/** An installation with no Melhor Envio app: the switch cannot move. */
export const SemMelhorEnvio: Story = {
  args: { carriers: { available: false, status: "DISCONNECTED", accountName: null, sandbox: false } },
}

export const Salvando: Story = { args: { pending: true } }

export const ComErroDoServidor: Story = { args: { error: "Alguma regra está fora do permitido. Confira as faixas." } }
