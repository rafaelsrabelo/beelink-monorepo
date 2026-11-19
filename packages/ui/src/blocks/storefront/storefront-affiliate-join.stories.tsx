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

/** The page as the shop window composes it, its side of the top as the story asks. */
function JoinPage({ aside = "preview" }: { aside?: "preview" | "form" | "sent" }) {
  const side =
    aside === "form" ? (
      <StorefrontAffiliateJoinForm view={joinForm} value={emptyJoinForm} onChange={noop} onSubmit={noop} onClose={noop} onTerms={noop} privacyHref="#privacidade" />
    ) : aside === "sent" ? (
      <StorefrontAffiliateJoinSent title="Recebemos sua candidatura, Ana!" message="A Lessari vai analisar. Se for aprovada, chega um convite no seu e-mail." homeHref="#loja" />
    ) : (
      <StorefrontAffiliateLinkPreview base="lessari.com.br/" example="Uma venda de R$ 200,00 em produtos pelo seu link rende R$ 20,00 para você." />
    )
  return (
    <div className="bg-shop-background">
      <StorefrontAffiliateJoinHero view={joinPage} aside={side} onOpen={noop} />
      <StorefrontAffiliateJoinSections view={joinPage} onOpen={noop} />
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

/** A página com os textos do produto e a prévia do link. */
export const Pagina: Story = {}

/** O formulário aberto no lugar da prévia. */
export const Formulario: Story = { args: { aside: "form" } }

/** A candidatura enviada. */
export const Enviada: Story = { args: { aside: "sent" } }

/** Com a imagem que a loja enviou no lugar da prévia do link. */
export const ComImagem: Story = {
  render: () => (
    <div className="bg-shop-background">
      <StorefrontAffiliateJoinHero view={joinPage} aside={<StorefrontAffiliateJoinPicture url="https://picsum.photos/seed/afiliado/800/600" />} onOpen={noop} />
    </div>
  ),
}

/** O bloco “Programa de afiliados” do modo design. */
export const Banner: Story = {
  render: () => <StorefrontAffiliateJoinBanner view={{ title: "Indique a Lessari e ganhe 10% em cada venda", text: "Divulgue com um link só seu e receba por Pix a cada venda entregue.", cta: "Quero ser afiliado" }} href="#seja-afiliado" />,
}
