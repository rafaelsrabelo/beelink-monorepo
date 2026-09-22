// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { StorefrontBand } from "./storefront-band"

const meta = {
  title: "Blocos/Vitrine/Faixa",
  component: StorefrontBand,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof StorefrontBand>

export default meta
type Story = StoryObj<typeof meta>

/**
 * A medida da loja: 1440px, e para aí. Existe porque a página inicial deixou de ser uma pilha fixa
 * de faixas e virou uma lista que o lojista arruma — quando a janela era dona de toda faixa, ela
 * decidia quais eram contidas e quais sangravam; agora quem decide é o bloco.
 */
export const Padrao: Story = {
  args: {
    children: (
      <div className="bg-muted flex h-32 items-center justify-center rounded-xl">
        Dentro da medida da loja
      </div>
    ),
  },
}
