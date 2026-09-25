// React
import { useState } from "react"

// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { StorefrontGalleryViewer } from "./storefront-gallery-viewer"

const meta = {
  title: "Blocos/Vitrine/Galeria · tela cheia",
  component: StorefrontGalleryViewer,
  parameters: { layout: "fullscreen" },
  args: {
    images: Array.from({ length: 4 }, (_, at) => ({ id: String(at), url: `https://picsum.photos/seed/haze-${at + 1}/1600/1600`, alt: null })),
    name: "Pré-Treino Haze Hardcore 300g",
    open: true,
    start: 0,
    onOpenChange: () => {},
  },
  render: (args) => {
    const [open, setOpen] = useState(args.open)
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>
          Abrir
        </button>
        <StorefrontGalleryViewer {...args} open={open} onOpenChange={setOpen} />
      </>
    )
  },
} satisfies Meta<typeof StorefrontGalleryViewer>

export default meta
type Story = StoryObj<typeof meta>

/** As fotos do tamanho da tela: arrastar, setas, ← e →, e Esc para fechar. */
export const Padrao: Story = {}

export const NaTerceira: Story = { args: { start: 2 } }
