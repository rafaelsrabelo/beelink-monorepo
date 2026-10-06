// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { fn } from "storybook/test"

// Block
import { StoreOpeningTemplate } from "./store-opening-template"
import { sampleOpeningTemplates } from "./store.fixtures"

const meta = {
  title: "Blocos/Loja/Modelo da página inicial",
  component: StoreOpeningTemplate,
  decorators: [(Story) => <div className="w-[40rem] p-4"><Story /></div>],
  args: { value: "", onChange: fn(), templates: sampleOpeningTemplates },
  render: function Controlled(args) {
    const [value, setValue] = useState(args.value)
    return <StoreOpeningTemplate {...args} value={value} onChange={setValue} />
  },
} satisfies Meta<typeof StoreOpeningTemplate>

export default meta
type Story = StoryObj<typeof meta>

/** Como abre: recolhido, com a página padrão valendo. */
export const Recolhido: Story = {}

/** Um modelo escolhido: as opções ficam à vista, com o indicado para a categoria primeiro. */
export const ModeloEscolhido: Story = { args: { value: "por-categorias" } }

/** A lista ainda não chegou: a página padrão já pode ser escolhida. */
export const Carregando: Story = { args: { value: "por-categorias", templates: [], state: "loading" } }

/** A lista não pôde ser lida: a página padrão continua valendo. */
export const Falha: Story = { args: { value: "por-categorias", templates: [], state: "failed", onRetry: fn() } }
