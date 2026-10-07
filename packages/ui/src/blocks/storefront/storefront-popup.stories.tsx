// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// UI
import { shopPaletteVariables } from "@harness-monorepo/ui/lib/shop-palette"

// Block
import { sampleColorPresets, sampleDarkShopColors } from "../store/store.fixtures"
import { popupPicture } from "./popup.fixtures"
import { StorefrontPopup } from "./storefront-popup"

const meta = {
  title: "Blocos/Vitrine/Pop-up de primeira compra",
  component: StorefrontPopup,
  parameters: { layout: "fullscreen" },
  args: {
    open: true,
    onOpenChange: () => {},
    title: "Ganhe 5% de desconto na primeira compra",
    text: "Crie sua conta e o desconto é seu.",
    action: { label: "Ganhar cupom", href: "#criar" },
    imageUrl: popupPicture,
    style: shopPaletteVariables(sampleColorPresets[2]!.colors),
  },
} satisfies Meta<typeof StorefrontPopup>

export default meta
type Story = StoryObj<typeof meta>

/** Com imagem, no computador: a foto na metade esquerda, a chamada na direita. */
export const ComImagem: Story = {}

/** Sem imagem: o painel colorido sozinho, mais estreito. */
export const SemImagem: Story = { args: { imageUrl: null } }

/** Benefício com condição: o mínimo do cupom vem escrito embaixo, com os números da API. */
export const ComCondicao: Story = { args: { title: "Ganhe R$ 15,00 de desconto na primeira compra", detail: "Em compras a partir de R$ 50,00." } }

/** Loja sem benefício de primeira compra: o convite simples, sem prometer nada. */
export const ConviteSimples: Story = {
  args: { imageUrl: null, title: "Crie sua conta na loja", text: "Acompanhe seus pedidos, salve favoritos e compre mais rápido.", action: { label: "Criar minha conta", href: "#criar" } },
}

/** Os textos nos limites: 80 no título, 200 no texto, 30 no botão. O diálogo rola por dentro se não couber. */
export const TextosNoLimite: Story = {
  args: {
    title: "Antes de ir embora: ganhe 5% de desconto na sua primeira compra aqui na loja!!",
    text: "Crie sua conta em menos de um minuto, confirme o seu e-mail e o cupom aparece para você na hora, pronto para usar no carrinho. Vale para a loja toda, uma vez por cliente, só no primeiro pedido.",
    detail: "Em compras a partir de R$ 50,00.",
    action: { label: "Quero ganhar o meu cupom já!!", href: "#criar" },
  },
}

/** Numa loja de página escura. */
export const LojaEscura: Story = { args: { style: shopPaletteVariables(sampleDarkShopColors) } }

/** Num celular: a foto vira uma faixa no alto e a chamada vem embaixo. */
export const NoCelular: Story = { globals: { viewport: { value: "mobile1" } } }

const sampleCode = { value: "SEJAMUTANTE", copyLabel: "Copiar", copiedLabel: "Copiado", selectedLabel: "Código selecionado" }

/** Cliente que já entrou e nunca pediu: o cupom, com o código grande, "Copiar" e o caminho para o carrinho (BEELINK-310). */
export const ClienteComCupom: Story = {
  args: { title: "Seu primeiro pedido tem 15% de desconto", text: "Use este cupom no carrinho:", code: sampleCode, action: { label: "Usar no carrinho", href: "#carrinho" } },
}

/** O mesmo, com o mínimo do cupom e sem imagem. */
export const ClienteComCupomEMinimo: Story = {
  args: { ...ClienteComCupom.args, imageUrl: null, detail: "Em compras a partir de R$ 50,00." },
}

/** Promoção de primeira compra: não há código; um botão só, que fecha. */
export const ClienteComPromocao: Story = {
  args: { title: "Seu primeiro pedido tem 15% de desconto", text: "Aplicado automaticamente no seu primeiro pedido. Não precisa de código.", action: { label: "Continuar comprando" } },
}

/** O cupom num celular: a foto vira faixa e o código continua inteiro. */
export const ClienteNoCelular: Story = { args: ClienteComCupom.args, globals: { viewport: { value: "mobile1" } } }

/** Fechado: nada na página. */
export const Fechado: Story = { args: { open: false } }
