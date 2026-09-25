// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { sampleColorPresets as presets } from "../store/store.fixtures"
import { StorefrontHeading } from "./storefront-heading"
import { StorefrontSectionBand } from "./storefront-section-band"

const palette = presets[0]!.colors

const meta = {
  title: "Blocos/Vitrine/Faixa/Cor",
  component: StorefrontSectionBand,
  parameters: { layout: "fullscreen" },
  args: {
    primary: palette.primary,
    children: (
      <>
        <StorefrontHeading title="Novidades da semana" subtitle="Chegou agora" />
        <p>O texto de dentro da faixa é pintado na cor derivada do fundo dela, sem ninguém escolher.</p>
      </>
    ),
  },
} satisfies Meta<typeof StorefrontSectionBand>

export default meta
type Story = StoryObj<typeof meta>

/** Sem cor própria: a faixa é a página, dentro da margem. */
export const Padrao: Story = {}

/**
 * Uma faixa escura num tema claro. O título continua na cor da marca, misturada só o bastante
 * para contrastar; o parágrafo vira claro. É a mesma regra que a vitrine aplica às quatro
 * superfícies dela, uma vez a mais, um nível abaixo. Com texto, a faixa tem 32px da própria cor em
 * cima e embaixo (`padded`): o espaçamento da página, pintado.
 */
export const Escura: Story = { args: { background: presets[4]!.colors.header, padded: true } }

/** Ponta a ponta: para capa e para faixas coloridas que devem sangrar até a borda. */
export const PontaAPonta: Story = { args: { width: "FULL", background: palette.header, padded: true } }

/** Sem `padded`: é o que uma faixa só de fotos faz, deixando a foto preencher a cor. */
export const ColoridaSemRespiro: Story = { args: { background: presets[4]!.colors.header } }
