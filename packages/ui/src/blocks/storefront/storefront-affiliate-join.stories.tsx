// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// UI
import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

// Block
import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontAffiliateJoinBanner } from "./storefront-affiliate-join-banner"
import { StorefrontAffiliateJoinForm } from "./storefront-affiliate-join-form"
import { StorefrontAffiliateJoinHero } from "./storefront-affiliate-join-hero"
import { StorefrontAffiliateJoinPicture } from "./storefront-affiliate-join-picture"
import { StorefrontAffiliateJoinSections } from "./storefront-affiliate-join-sections"
import { StorefrontAffiliateJoinSent } from "./storefront-affiliate-join-sent"
import { emptyJoinForm, joinForm, joinPage } from "./storefront-affiliate-join.fixtures"
import { StorefrontAffiliateLinkPreview } from "./storefront-affiliate-link-preview"

const noop = () => {}

/** The page as the shop window composes it: the form open at the top, or its answer, and the shop's picture or the link's preview. */
function JoinPage({ sent = false, picture = false }: { sent?: boolean; picture?: boolean }) {
  const form = sent ? (
    <StorefrontAffiliateJoinSent title="Recebemos sua candidatura, Ana!" message="A Lessari vai analisar. Se for aprovada, chega um convite no seu e-mail." homeHref="#loja" />
  ) : (
    <StorefrontAffiliateJoinForm view={joinForm} value={emptyJoinForm} onChange={noop} onSubmit={noop} onTerms={noop} privacyHref="#privacidade" />
  )
  const media = picture ? (
    <StorefrontAffiliateJoinPicture url="https://picsum.photos/seed/afiliado/800/600" />
  ) : (
    <StorefrontAffiliateLinkPreview base="lessari.com.br/" example="Uma venda de R$ 200,00 em produtos pelo seu link rende R$ 20,00 para você." />
  )
  return (
    <div className="bg-shop-background">
      <StorefrontAffiliateJoinHero view={joinPage} form={form} media={media} />
      <StorefrontAffiliateJoinSections view={joinPage} />
    </div>
  )
}

const meta = {
  title: "Blocos/Vitrine/Afiliado/Seja afiliado",
  component: JoinPage,
  parameters: { layout: "fullscreen" },
  decorators: [(Story) => <div style={shopPaletteStyle(sampleColorPresets[2]!.colors)}>{Story()}</div>],
} satisfies Meta<typeof JoinPage>

export default meta
type Story = StoryObj<typeof meta>

/** A página já com o formulário aberto, os textos do produto e a prévia do link. */
export const Pagina: Story = {}

/** A candidatura enviada, no lugar do formulário. */
export const Enviada: Story = { args: { sent: true } }

/** Com a imagem que a loja enviou no lugar da prévia do link. */
export const ComImagem: Story = { args: { picture: true } }

/** O banner na página inicial da loja. */
export const Banner: Story = {
  render: () => <StorefrontAffiliateJoinBanner view={{ title: "Indique a Lessari e ganhe 10% em cada venda", text: "Divulgue com um link só seu e receba por Pix a cada venda entregue.", cta: "Quero ser afiliado" }} href="#seja-afiliado" />,
}
