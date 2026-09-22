// React
import type { CSSProperties } from "react"

// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { BenefitIcon } from "../design/benefit-icons"
import { StorefrontBenefits } from "./storefront-benefits"

const meta = {
  title: "Blocos/Vitrine/Faixa de vantagens",
  component: StorefrontBenefits,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div
        style={
          {
            "--shop-header": "oklch(0.55 0.2 250)",
            "--shop-primary": "oklch(0.55 0.2 250)",
            "--shop-primary-ink": "oklch(0.45 0.2 250)",
          } as CSSProperties
        }
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StorefrontBenefits>

export default meta
type Story = StoryObj<typeof meta>

/**
 * O que a loja promete, escrito pelo lojista. Era derivada dos meios de pagamento, com as palavras
 * da plataforma e os ícones dela — agora ela pode prometer o que a plataforma nunca imaginou.
 *
 * O ícone chega como nó, nunca como nome: uma tabela que soubesse que "qr-code" quer dizer PIX
 * seria um design system que sabe o que é PIX.
 */
export const Padrao: Story = {
  args: {
    items: [
      { id: "1", title: "Frete grátis", detail: "Acima de R$ 199", icon: <BenefitIcon name="truck" /> },
      { id: "2", title: "PIX", detail: "Transferência na hora", icon: <BenefitIcon name="qr-code" /> },
      { id: "3", title: "Troca fácil", detail: "30 dias para mudar de ideia", icon: <BenefitIcon name="refresh-cw" /> },
      { id: "4", title: "Atendimento", detail: "Respondemos no WhatsApp", icon: <BenefitIcon name="message-circle" /> },
    ],
  },
}

/** Sem ícone, para a loja que só quer dizer as coisas. */
export const SemIcone: Story = {
  args: { items: [{ id: "1", title: "Entrega em toda a cidade" }] },
}

/** Vazia não desenha faixa nenhuma — é assim que o lojista a desliga. */
export const Vazia: Story = { args: { items: [] } }
