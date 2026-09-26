// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

// Locales
import { en } from "../../locales/en"

// Block
import { SectionGallery } from "./section-gallery"

const meta = {
  title: "Blocos/Modo design/Galeria de seções",
  component: SectionGallery,
  parameters: { layout: "fullscreen" },
  args: { open: true, onOpenChange: fn(), onAdd: fn(), placement: "Entra entre Capa e Produtos." },
} satisfies Meta<typeof SectionGallery>

export default meta
type Story = StoryObj<typeof meta>

/** Uma loja, aberta num "+" entre faixas: as fileiras de banners aparecem. */
export const Loja: Story = {
  args: { unavailable: ["CONTACT"], offerRows: true },
}

/** Um site: sem produtos nem categorias, e com formulário de contato. */
export const Site: Story = {
  args: { unavailable: ["PRODUCTS", "CATEGORIES"] },
}

/** Dentro de uma faixa: um banner só, e a barra de aviso não é oferecida. */
export const DentroDeUmaFaixa: Story = {
  args: { unavailable: ["CONTACT", "ANNOUNCEMENT"], placement: "Entra em Faixa 2, depois de Banner." },
}

/** Com prévias da tela: aqui, um retângulo no lugar do componente real. */
export const ComPrevias: Story = {
  args: {
    unavailable: ["CONTACT"],
    renderPreview: (entry) => <div className="bg-primary/10 text-primary grid h-24 place-items-center text-xs">{entry.name}</div>,
  },
}

export const EmIngles: Story = { args: { messages: en, placement: "Goes between Cover and Products." } }
