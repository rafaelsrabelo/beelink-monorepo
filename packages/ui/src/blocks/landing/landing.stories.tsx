import type { Meta, StoryObj } from "@storybook/react-vite"

import { ptBR } from "@harness-monorepo/ui/locales/index"

import { BeelinkLogo } from "./beelink-logo"
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
import { LandingPosters } from "./landing-posters"
import { LandingShell } from "./landing-shell"
import { LandingSteps } from "./landing-steps"

const hrefs = { loginHref: "#entrar", signupHref: "#criar", termsHref: "#termos", privacyHref: "#privacidade" }

/** A stand-in for the brand's photographs, which the app draws with its own optimised image. */
function photo(seed: string, width: number, height: number, alt = "") {
  return <img src={`https://picsum.photos/seed/${seed}/${width}/${height}`} alt={alt} className="absolute inset-0 size-full object-cover" />
}

const photos = {
  courier: photo("beelink-moto", 1024, 1536),
  busStop: photo("beelink-ponto", 1024, 1280, ptBR.landing.posters.busStopAlt),
  wall: photo("beelink-muro", 1024, 1536, ptBR.landing.posters.wallAlt),
}

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
        <LandingCouriers photo={photos.courier} termsHref={hrefs.termsHref} privacyHref={hrefs.privacyHref} />
        <LandingFaq />
        <LandingPosters busStop={photos.busStop} wall={photos.wall} />
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

/** A seção preta, com o formulário sobre a foto do entregador. Ele valida e não envia nada: o cadastro ainda não está aberto. */
export const Entregadores: Story = {
  args: { children: null },
  render: () => (
    <LandingShell className="min-h-0 py-10">
      <LandingCouriers photo={photos.courier} termsHref={hrefs.termsHref} privacyHref={hrefs.privacyHref} />
    </LandingShell>
  ),
}

/** Os pôsteres da marca, lado a lado, antes da chamada final. */
export const Posteres: Story = {
  args: { children: null },
  render: () => (
    <LandingShell className="min-h-0">
      <LandingPosters busStop={photos.busStop} wall={photos.wall} />
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

/** O topo numa tela estreita: os links de seção, os termos e a política de privacidade vão para o menu. */
export const TopoNoCelular: Story = { ...TopoEHero, globals: { viewport: { value: "mobile1", isRotated: false } } }

/** A logo oficial, inteira e só a sacola, no creme e no amarelo: a marca e as alças são vazadas e mostram o fundo. */
export const Logo: Story = {
  args: { children: null },
  render: () => (
    <div className="flex flex-col">
      {["bg-brand-ground", "bg-brand-yellow"].map((ground) => (
        <div key={ground} className={`flex items-center gap-8 p-10 text-brand-ink ${ground}`}>
          <BeelinkLogo label="Beelink" className="h-11" />
          <BeelinkLogo variant="icon" label="Beelink" className="h-11" />
        </div>
      ))}
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

/** No celular: uma coluna, sem o hub, com os banners rolando de lado. */
export const NoCelular: Story = { ...Pagina, globals: { viewport: { value: "mobile1", isRotated: false } } }
