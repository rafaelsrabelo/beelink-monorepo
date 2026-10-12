// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"

// Locales
import { en, ptBR } from "@harness-monorepo/ui/locales/index"

// Block
import { LandingConsent } from "./landing-consent"
import { LandingCta } from "./landing-cta"
import { LandingFooter } from "./landing-footer"
import { LandingFooterAction } from "./landing-footer-action"
import { examplePlanPrices } from "./landing-plans.fixtures"
import { LandingShell } from "./landing-shell"

/**
 * O aviso de cookies da landing (BEELINK-319). Ele gruda no pé da tela enquanto a página rola e, no
 * fim da página, pousa depois do rodapé: é a moldura (`LandingShell`) que o põe ali, por isso as
 * histórias o desenham dentro dela, com a chamada final e o rodapé por cima.
 */
const meta = {
  title: "Blocos/Landing/Aviso de cookies",
  component: LandingConsent,
  parameters: { layout: "fullscreen" },
  args: { privacyHref: "#privacidade", onAccept: () => {}, onRefuse: () => {}, text: ptBR.landing.consent },
  render: (args) => (
    <LandingShell className="pt-10" notice={<LandingConsent {...args} />}>
      <LandingCta signupHref="#criar" trialDays={examplePlanPrices.trialDays} />
      <LandingFooter termsHref="#termos" privacyHref="#privacidade" year={2026} />
    </LandingShell>
  ),
} satisfies Meta<typeof LandingConsent>

export default meta
type Story = StoryObj<typeof meta>

/** A primeira visita: dois botões iguais, nenhum marcado, e nenhum jeito de fechar sem responder. */
export const PrimeiraVisita: Story = {}

/** Reaberto pelo "Cookies" do rodapé, por quem já aceitou. */
export const ReabertoAceito: Story = { args: { current: "granted" } }

/** Reaberto por quem recusou. */
export const ReabertoRecusado: Story = { args: { current: "denied" } }

/** No celular: o texto em cima e os dois botões lado a lado, da mesma largura. */
export const NoCelular: Story = { globals: { viewport: { value: "mobile1", isRotated: false } } }

/** Em inglês: o bloco só conhece as frases que recebe. */
export const EmIngles: Story = { args: { text: en.landing.consent } }

/**
 * Como a página o usa: responder tira o aviso da tela, e o "Cookies" do rodapé (`LandingFooterAction`)
 * o traz de volta com a escolha atual. Quem liga os dois à resposta guardada é o app.
 */
export const ComORodape: Story = {
  render: function Answered(args) {
    const [choice, setChoice] = useState<"granted" | "denied" | null>(null)
    const [asking, setAsking] = useState(true)
    const answer = (given: "granted" | "denied") => {
      setChoice(given)
      setAsking(false)
    }

    return (
      <LandingShell className="pt-10" notice={asking ? <LandingConsent {...args} current={choice} onAccept={() => answer("granted")} onRefuse={() => answer("denied")} /> : null}>
        <LandingCta signupHref="#criar" trialDays={examplePlanPrices.trialDays} />
        <LandingFooter termsHref="#termos" privacyHref="#privacidade" year={2026} cookies={<LandingFooterAction onClick={() => setAsking(true)}>Cookies</LandingFooterAction>} />
      </LandingShell>
    )
  },
}
