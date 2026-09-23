// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Locales
import { en } from "../../locales/en"
import { BlockGallery } from "./block-gallery"

const meta = {
  title: "Blocos/Modo design/Galeria de blocos",
  component: BlockGallery,
  parameters: { layout: "padded" },
  args: { onAdd: () => {}, defaultOpen: true },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BlockGallery>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Todos os blocos de uma loja, arquivados por função. Cada cartão traz o desenho do bloco e uma
 * linha do que ele é — a lista de nomes que isto substituiu não dizia se "Produtos" sai em grade ou
 * em fileira, e a única forma de descobrir era adicionar, olhar e apagar.
 */
export const Padrao: Story = {}

/**
 * Uma loja: sem formulário de contato, porque os contatos que ele recebe não têm tela onde ser
 * lidos. O grupo *Contato* não é desenhado — um título sobre lista vazia é o que arquivar por tipo
 * de página produziria.
 */
export const Loja: Story = { args: { unavailable: ["CONTACT"] } }

/** Um site: sem catálogo. O grupo *Catálogo* desaparece pela mesma razão. */
export const Site: Story = { args: { unavailable: ["PRODUCTS", "CATEGORIES"] } }

/** O que a loja já tem some da galeria: barra de aviso e lista de produtos são únicas. */
export const ComAlgunsJaCriados: Story = { args: { taken: ["ANNOUNCEMENT", "PRODUCTS"] } }

/** Enquanto um bloco está sendo criado, nada mais é clicável — nem o botão, nem os cartões. */
export const Adicionando: Story = { args: { pending: true, defaultOpen: true } }

/** Fechada, que é como o painel de modo design a mostra: um botão de largura inteira. */
export const Fechada: Story = { args: { defaultOpen: false } }

export const EmIngles: Story = { args: { messages: en } }
