import type { Meta, StoryObj } from "@storybook/react-vite"

import { en } from "@harness-monorepo/ui/locales/index"

import { LandingPlans } from "./landing-plans"
import { examplePlanPrices } from "./landing-plans.fixtures"
import { LandingShell } from "./landing-shell"

/**
 * A seção "Planos" da landing. Os preços e os dias de teste daqui são de exemplo, de propósito: os da
 * Beelink moram em `apps/web/src/lib/plans.ts`, e o bloco só desenha o que recebe.
 */
const meta = {
  title: "Blocos/Landing/Planos",
  component: LandingPlans,
  parameters: { layout: "fullscreen" },
  args: { prices: examplePlanPrices, locale: "pt-BR", signupHref: "#criar" },
  decorators: [
    (Story) => (
      <LandingShell className="min-h-0 pt-10">
        <Story />
      </LandingShell>
    ),
  ],
} satisfies Meta<typeof LandingPlans>

export default meta
type Story = StoryObj<typeof meta>

/** Um cartão sobre o outro; a partir de 1024 px, cada um se divide em dois: o plano de um lado, o que ele inclui do outro. O seletor troca o valor sem script: é o rádio marcado que mostra os números. */
export const Planos: Story = {}

/** No celular: tudo numa coluna, com os três períodos numa linha. */
export const NoCelular: Story = { globals: { viewport: { value: "mobile1", isRotated: false } } }

/** Em inglês, os valores seguem a escrita do idioma e continuam em reais. */
export const EmIngles: Story = { args: { locale: "en", messages: en } }

/** Um período que não sai mais barato que o mensal não anuncia economia. */
export const SemEconomia: Story = {
  args: { prices: { ...examplePlanPrices, beelink: { monthly: 10000, semiannual: 60000, annual: 120000 } } },
}
