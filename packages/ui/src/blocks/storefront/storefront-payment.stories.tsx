import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontPaymentCard } from "./storefront-payment-card"
import { StorefrontPaymentLayout } from "./storefront-payment-layout"
import { StorefrontPaymentNotice } from "./storefront-payment-notice"
import { StorefrontPaymentPix } from "./storefront-payment-pix"
import { StorefrontPaymentSkeleton } from "./storefront-payment-skeleton"
import { SAMPLE_PIX_CODE, SAMPLE_QR } from "./storefront-payment.fixtures"

const meta = {
  title: "Blocos/Vitrine/Pagamento do pedido",
  component: StorefrontPaymentLayout,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={shopPaletteStyle(sampleColorPresets[2]!.colors)}>{Story()}</div>],
  args: { number: 14, orderHref: "#", children: null },
} satisfies Meta<typeof StorefrontPaymentLayout>

export default meta
type Story = StoryObj<typeof meta>

const notice = (variant: Parameters<typeof StorefrontPaymentNotice>[0]["variant"], pending = false) => <StorefrontPaymentNotice variant={variant} orderHref="#" onAction={() => {}} pending={pending} />

/** O Pix a pagar: o valor, o QR, o copia e cola e até quando vale. */
export const Pix: Story = { args: { children: <StorefrontPaymentPix amount="R$ 179,90" image={SAMPLE_QR} payload={SAMPLE_PIX_CODE} validUntil="7 de out., 23:59" /> } }

/** O cartão: o valor, as parcelas e a porta para a página do Asaas, em nova aba. */
export const Cartao: Story = { args: { children: <StorefrontPaymentCard amount="R$ 239,70" installments="3x de R$ 79,90 sem juros" invoiceUrl="#" validUntil="9 de out., 23:59" /> } }

/** Enquanto o pagamento é lido. */
export const Carregando: Story = { args: { children: <StorefrontPaymentSkeleton /> } }

/** O Pix venceu: gerar um novo. */
export const PixVencido: Story = { args: { children: notice("pixExpired") } }

/** O código ainda não chegou do Asaas: a tela tenta de novo sozinha. */
export const PixSendoGerado: Story = { args: { children: notice("pixWaiting") } }

/** O prazo do cartão acabou. */
export const CartaoVencido: Story = { args: { children: notice("cardExpired") } }

/** O pedido existe e a cobrança não: o Asaas falhou ao fechar o pedido. */
export const SemCobranca: Story = { args: { children: notice("none") } }

/** Gerando a cobrança: o botão espera. */
export const GerandoCobranca: Story = { args: { children: notice("none", true) } }

/** A cobrança anterior foi cancelada. */
export const CobrancaCancelada: Story = { args: { children: notice("chargeCancelled") } }

/** Frete a combinar: nada a pagar até a loja informar o frete. */
export const AguardandoFrete: Story = { args: { children: notice("awaitingTotal") } }

/** O pagamento foi confirmado com a tela aberta. */
export const Aprovado: Story = { args: { children: notice("paid") } }

/** O valor voltou para o cliente. */
export const Estornado: Story = { args: { children: notice("refunded") } }

/** O pedido foi cancelado. */
export const PedidoCancelado: Story = { args: { children: notice("orderCancelled") } }

/** O pagamento não pôde ser lido. */
export const NaoCarregou: Story = { args: { children: notice("unread") } }

/** Uma recusa ao gerar a cobrança, dita sobre o aviso. */
export const Recusa: Story = { args: { alert: "A loja não consegue receber online agora. Tente de novo em instantes.", children: notice("none") } }
