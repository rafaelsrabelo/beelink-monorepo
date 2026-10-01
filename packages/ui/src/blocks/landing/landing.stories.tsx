import type { Meta, StoryObj } from "@storybook/react-vite"

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
      <LandingHeader loginHref={hrefs.loginHref} signupHref={hrefs.signupHref} />
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
      <LandingHeader loginHref={hrefs.loginHref} signupHref={hrefs.signupHref} />
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
      <LandingCourierForm termsHref={hrefs.termsHref} privacyHref={hrefs.privacyHref} />
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
export const NoCelular: Story = { ...Pagina, globals: { viewport: { value: "mobile1", isRotated: false } } }
