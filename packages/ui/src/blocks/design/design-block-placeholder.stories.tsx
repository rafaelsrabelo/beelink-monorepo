// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Locales
import { en } from "../../locales/en"
import { DesignBlockPlaceholder } from "./design-block-placeholder"

const meta = {
  title: "Blocos/Modo design/Lugar de um bloco vazio",
  component: DesignBlockPlaceholder,
  parameters: { layout: "padded" },
  args: { kind: "BANNER", label: "Banner" },
} satisfies Meta<typeof DesignBlockPlaceholder>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Um banner recém-criado. Antes disto a página não mudava nada ao adicionar um: o renderizador
 * devolve `null` sem imagem, então o lojista ficava procurando o bloco que a lista dizia existir.
 */
export const Banner: Story = {}

/** O desenho é o mesmo da galeria, de propósito: você escolheu por uma figura, a página responde com ela. */
export const Vantagens: Story = { args: { kind: "BENEFITS", label: "Vantagens" } }

export const Titulo: Story = { args: { kind: "HEADING", label: "Título" } }

/** Com título próprio, o bloco se chama pelo que o lojista escreveu. */
export const ComTitulo: Story = { args: { kind: "TEXT", label: "Sobre a loja" } }

export const EmIngles: Story = { args: { messages: en } }
