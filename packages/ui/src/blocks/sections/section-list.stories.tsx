// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Locales
import { en } from "../../locales/en"

// Block
import { SectionList, type SectionListItem } from "./section-list"

const banners: SectionListItem[] = [
  {
    id: "1",
    title: "Promoção de inverno",
    subtitle: "Até 40% em malhas",
    imageUrl: "https://picsum.photos/seed/inverno/400/225",
    destination: "Categoria · Blusas",
    external: false,
    layoutLabel: "Largura cheia",
    isActive: true,
  },
  {
    id: "2",
    title: "Whey 900g",
    subtitle: null,
    imageUrl: "https://picsum.photos/seed/whey/400/225",
    destination: "Produto · Whey Protein Concentrado 900g",
    external: false,
    layoutLabel: "Metade",
    isActive: true,
  },
  {
    id: "3",
    title: "Fale no WhatsApp",
    subtitle: "Atendimento das 9h às 18h",
    imageUrl: "https://picsum.photos/seed/whats/400/225",
    destination: "https://wa.me/5585999998888",
    external: true,
    layoutLabel: "Um terço",
    isActive: false,
  },
]

const meta = {
  title: "Blocos/Banners/Lista",
  component: SectionList,
  parameters: { layout: "padded" },
  args: { banners, onEdit: () => {}, onDelete: () => {}, onMove: () => {} },
} satisfies Meta<typeof SectionList>

export default meta
type Story = StoryObj<typeof meta>

/**
 * As três coisas que um banner pode apontar, e os dois estados que não se veem na foto: um oculto
 * e um que sai da loja. Uma lista em que toda linha é igual não prova nada sobre a lista.
 */
export const Padrao: Story = {}

export const Vazia: Story = { args: { banners: [] } }

/** Sem reordenar — é assim que a lista fica antes de a tela ligar o endpoint. */
export const SemMover: Story = { args: { onMove: undefined } }

export const EmIngles: Story = { args: { messages: en } }
