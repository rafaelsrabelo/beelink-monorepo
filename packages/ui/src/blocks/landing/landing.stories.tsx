import type { Meta, StoryObj } from "@storybook/react-vite"

import { ptBR } from "@harness-monorepo/ui/locales/index"

import { BeelinkBag } from "./beelink-bag"
import { BrandLines } from "./brand-lines"
import { LandingBanners } from "./landing-banners"
import { LandingCourierForm } from "./landing-courier-form"
import { LandingCouriers } from "./landing-couriers"
import { LandingCta } from "./landing-cta"
import { LandingEcosystem } from "./landing-ecosystem"
import { LandingFaq } from "./landing-faq"
import { LandingFooter } from "./landing-footer"
import { LandingHeader } from "./landing-header"
import { LandingHero } from "./landing-hero"
import { LandingShell } from "./landing-shell"
import { LandingSteps } from "./landing-steps"

const hrefs = { loginHref: "#entrar", signupHref: "#criar", termsHref: "#termos", privacyHref: "#privacidade" }

const meta = {
  title: "Blocos/Landing",
  component: LandingShell,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof LandingShell>

export default meta
type Story = StoryObj<typeof meta>

/** A landing inteira, como a rota inicial monta. O tipo da marca (Plus Jakarta Sans) é carregado pela tela; aqui vale o do Storybook. */
export const Pagina: Story = {
  args: { children: null },
  render: () => (
    <LandingShell>
      <LandingHeader {...hrefs} />
      <main>
        <LandingHero signupHref={hrefs.signupHref} />
        <LandingBanners signupHref={hrefs.signupHref} exampleHref="#loja-de-exemplo" />
        <LandingEcosystem />
        <LandingSteps />
        <LandingCouriers termsHref={hrefs.termsHref} privacyHref={hrefs.privacyHref} />
        <LandingFaq />
        <LandingCta signupHref={hrefs.signupHref} />
      </main>
      <LandingFooter termsHref={hrefs.termsHref} privacyHref={hrefs.privacyHref} year={2026} />
    </LandingShell>
  ),
}

/** O topo e o hero: o hub só aparece na largura em que o palco dele cabe. */
export const TopoEHero: Story = {
  args: { children: null },
  render: () => (
    <LandingShell className="min-h-0">
      <LandingHeader {...hrefs} />
      <LandingHero signupHref={hrefs.signupHref} />
    </LandingShell>
  ),
}

/** Os três banners. Sem loja de exemplo configurada, o primeiro só oferece criar a loja. */
export const Banners: Story = {
  args: { children: null },
  render: () => (
    <LandingShell className="min-h-0">
      <LandingBanners signupHref={hrefs.signupHref} />
    </LandingShell>
  ),
}

/** Os cinco hexágonos em volta da marca; em telas estreitas, a mesma lista em cards. */
export const Ecossistema: Story = {
  args: { children: null },
  render: () => (
    <LandingShell className="min-h-0">
      <LandingEcosystem />
    </LandingShell>
  ),
}

export const Passos: Story = {
  args: { children: null },
  render: () => (
    <LandingShell className="min-h-0">
      <LandingSteps />
    </LandingShell>
  ),
}

/** A seção preta, com o formulário. Ele valida e não envia nada: o cadastro ainda não está aberto. */
export const Entregadores: Story = {
  args: { children: null },
  render: () => (
    <LandingShell className="min-h-0 py-10">
      <LandingCouriers termsHref={hrefs.termsHref} privacyHref={hrefs.privacyHref} />
    </LandingShell>
  ),
}

/** O formulário sozinho, sobre o preto da seção. */
export const FormularioDoEntregador: Story = {
  args: { children: null },
  render: () => (
    <LandingShell className="flex min-h-0 justify-center bg-brand-ink p-10">
      <LandingCourierForm termsHref={hrefs.termsHref} privacyHref={hrefs.privacyHref} text={ptBR.landing.couriers.form} />
    </LandingShell>
  ),
}

export const Perguntas: Story = {
  args: { children: null },
  render: () => (
    <LandingShell className="min-h-0">
      <LandingFaq />
    </LandingShell>
  ),
}

/** A chamada final e o rodapé. */
export const ChamadaERodape: Story = {
  args: { children: null },
  render: () => (
    <LandingShell className="min-h-0 pt-10">
      <LandingCta signupHref={hrefs.signupHref} />
      <LandingFooter termsHref={hrefs.termsHref} privacyHref={hrefs.privacyHref} year={2026} />
    </LandingShell>
  ),
}

/** No celular: uma coluna, sem o hub, com os banners rolando de lado. */
/** O topo numa tela estreita: os links de seção, os termos e a política de privacidade vão para o menu. */
export const TopoNoCelular: Story = { ...TopoEHero, globals: { viewport: { value: "mobile1", isRotated: false } } }

/** O ícone: a sacola com a marca. É o da aba do navegador, do link compartilhado e da barra do painel. */
export const Icone: Story = {
  args: { children: null },
  render: () => (
    <div className="flex items-center gap-6 bg-brand-yellow p-10 text-brand-ink">
      <BeelinkBag className="size-8" />
      <BeelinkBag className="size-24" />
    </div>
  ),
}

/** As duas linhas amarelas do canto, sozinhas: a landing e as telas de conta as desenham. */
export const Linhas: Story = {
  args: { children: null },
  render: () => (
    <div className="relative h-80 overflow-hidden bg-brand-ground">
      <BrandLines className="top-0 right-0" />
    </div>
  ),
}

export const NoCelular: Story = { ...Pagina, globals: { viewport: { value: "mobile1", isRotated: false } } }
