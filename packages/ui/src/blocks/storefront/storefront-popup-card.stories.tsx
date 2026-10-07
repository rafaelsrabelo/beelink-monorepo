// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// UI
import { shopPaletteVariables } from "@harness-monorepo/ui/lib/shop-palette"

// Block
import { sampleColorPresets } from "../store/store.fixtures"
import { popupPicture } from "./popup.fixtures"
import { POPUP_TEXT, POPUP_TITLE, StorefrontPopupCard } from "./storefront-popup-card"

const meta = {
  title: "Blocos/Vitrine/Pop-up de primeira compra/Cartão",
  component: StorefrontPopupCard,
  decorators: [(Story) => <div style={shopPaletteVariables(sampleColorPresets[2]!.colors)}>{Story()}</div>],
  args: {
    preview: true,
    heading: <p className={POPUP_TITLE}>Ganhe 5% de desconto na primeira compra</p>,
    body: <p className={POPUP_TEXT}>Crie sua conta e o desconto é seu.</p>,
    action: { label: "Ganhar cupom", href: "#criar" },
    imageUrl: popupPicture,
  },
} satisfies Meta<typeof StorefrontPopupCard>

export default meta
type Story = StoryObj<typeof meta>

/** Com espaço (45rem): a foto de um lado, a chamada do outro. */
export const LadoALado: Story = { decorators: [(Story) => <div className="w-[45rem]">{Story()}</div>] }

/** Sem espaço (a largura de um celular): a foto vira faixa no alto. Quem decide é o espaço dado, não a tela. */
export const Empilhado: Story = { decorators: [(Story) => <div className="w-[22.375rem]">{Story()}</div>] }

/** Para o cliente que nunca pediu: o código do cupom entre o texto e o botão (BEELINK-310). */
export const ComCodigo: Story = {
  args: {
    heading: <p className={POPUP_TITLE}>Seu primeiro pedido tem 15% de desconto</p>,
    body: <p className={POPUP_TEXT}>Use este cupom no carrinho:</p>,
    code: { value: "SEJAMUTANTE", copyLabel: "Copiar", copiedLabel: "Copiado", selectedLabel: "Código selecionado" },
    action: { label: "Usar no carrinho", href: "#carrinho" },
  },
  decorators: [(Story) => <div className="w-[45rem]">{Story()}</div>],
}

/** Sem imagem: o painel colorido sozinho. */
export const SoOPainel: Story = { args: { imageUrl: null }, decorators: [(Story) => <div className="w-[28rem]">{Story()}</div>] }
