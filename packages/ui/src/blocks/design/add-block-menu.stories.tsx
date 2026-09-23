// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { AddBlockMenu } from "./add-block-menu"

const meta = {
  title: "Blocos/Modo design/Adicionar bloco",
  component: AddBlockMenu,
  parameters: { layout: "padded" },
  args: { onAdd: () => {} },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AddBlockMenu>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Só os blocos cujo conteúdo inteiro é texto que o lojista digita — esses podem nascer vazios e ser
 * preenchidos no lugar.
 *
 * **Banner não está aqui, de propósito.** Ele tem foto, destino e formato para escolher, o que é um
 * formulário e não um item de menu: faz-se na tela de Banners e cai no arranjo. É lá também que se
 * faz um carousel — dois banners "no topo da página", um seguido do outro.
 */
export const Padrao: Story = {}

/** Um bloco que a loja já tem some da lista: barra de aviso e lista de produtos são únicas. */
export const ComAlgunsJaCriados: Story = { args: { taken: ["ANNOUNCEMENT", "BENEFITS"] } }
