// React
import { useState } from "react"

// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// UI
import type { GoogleAnalyticsCardView } from "@harness-monorepo/ui/lib/integrations"

// Block
import { GoogleAnalyticsCard } from "./google-analytics-card"
import { GoogleAnalyticsGuide } from "./google-analytics-guide"
import { GoogleAnalyticsReports } from "./google-analytics-reports"
import { GOOGLE_ANALYTICS_HOME, GOOGLE_ANALYTICS_LOGO, googleAnalyticsConnected, googleAnalyticsDisconnected } from "./integrations.fixtures"
import { IntegrationsResult } from "./integrations-result"

const noop = () => {}

const meta = {
  title: "Blocos/Painel/Integrações/Google Analytics",
  component: GoogleAnalyticsCard,
  decorators: [(Story) => <div className="max-w-3xl">{Story()}</div>],
  args: { view: googleAnalyticsConnected, logoSrc: GOOGLE_ANALYTICS_LOGO, onConnect: noop, onDisconnect: noop },
} satisfies Meta<typeof GoogleAnalyticsCard>

export default meta
type Story = StoryObj<typeof meta>

/** Um ID salvo: o selo verde, qual é o ID e quando foi salvo. "Trocar o ID" abre o campo. */
export const Conectado: Story = {}

/** A loja que ainda não informou o ID: para que serve e o campo do ID. */
export const NaoConectado: Story = { args: { view: googleAnalyticsDisconnected } }

/** O ID está sendo salvo: o campo travado e o botão ocupado. */
export const Conectando: Story = { args: { view: googleAnalyticsDisconnected, connecting: true } }

/** A recusa em palavras, sob o campo: a da API, quando ela não aceita o que o formulário deixou passar. */
export const IdRecusado: Story = {
  args: {
    view: googleAnalyticsDisconnected,
    connectError: "Esse não parece um ID de medição. Ele começa com G-, seguido de letras maiúsculas e números, como G-AB12CD34EF. Os códigos que começam com UA-, GTM- ou AW- são de outros produtos do Google e não servem aqui.",
  },
}

/** O desconectar que não passou. */
export const DesconectarFalhou: Story = { args: { disconnectError: "Não foi possível desconectar agora. Tente de novo." } }

/** O passo a passo de onde copiar o ID no Google Analytics e o que é bom saber. */
export const PassoAPasso: Story = { render: () => <GoogleAnalyticsGuide analyticsHref={GOOGLE_ANALYTICS_HOME} /> }

/** O aviso de que os relatórios ficam no Google Analytics, com o link. */
export const Relatorios: Story = { render: () => <GoogleAnalyticsReports analyticsHref={GOOGLE_ANALYTICS_HOME} /> }

/**
 * A página como a tela a liga: salvar leva um instante e troca o cartão; desconectar volta ao começo.
 * Cole um código UA- ou GTM- no campo para ver a recusa, ou o ID com espaços para ver que ele passa.
 */
function Live() {
  const [view, setView] = useState<GoogleAnalyticsCardView>(googleAnalyticsDisconnected)
  const [connecting, setConnecting] = useState(false)

  function connect(measurementId: string) {
    setConnecting(true)
    window.setTimeout(() => {
      setConnecting(false)
      setView({ measurementId, connectedAt: new Date().toISOString(), savedAt: "07/10/2026" })
    }, 800)
  }

  return (
    <div className="flex flex-col gap-6">
      {view.measurementId ? <IntegrationsResult tone="done" message="Google Analytics conectado: o ID foi salvo." /> : null}
      <GoogleAnalyticsCard view={view} logoSrc={GOOGLE_ANALYTICS_LOGO} headingAs="h1" onConnect={connect} connecting={connecting} onDisconnect={() => setView(googleAnalyticsDisconnected)} />
      <GoogleAnalyticsGuide analyticsHref={GOOGLE_ANALYTICS_HOME} />
      <GoogleAnalyticsReports analyticsHref={GOOGLE_ANALYTICS_HOME} />
    </div>
  )
}

export const AoVivo: Story = { render: () => <Live /> }
