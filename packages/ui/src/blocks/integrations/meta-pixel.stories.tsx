// React
import { useState } from "react"

// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// UI
import type { MetaPixelCardView } from "@harness-monorepo/ui/lib/integrations"

// Block
import { META_EVENTS_MANAGER, META_LOGO, metaPixelConnected, metaPixelDisconnected } from "./integrations.fixtures"
import { IntegrationsResult } from "./integrations-result"
import { MetaPixelCard } from "./meta-pixel-card"
import { MetaPixelGuide } from "./meta-pixel-guide"
import { MetaPixelReportLink } from "./meta-pixel-report-link"

const noop = () => {}

const meta = {
  title: "Blocos/Painel/Integrações/Pixel da Meta",
  component: MetaPixelCard,
  decorators: [(Story) => <div className="max-w-3xl">{Story()}</div>],
  args: { view: metaPixelConnected, logoSrc: META_LOGO, onConnect: noop, onDisconnect: noop },
} satisfies Meta<typeof MetaPixelCard>

export default meta
type Story = StoryObj<typeof meta>

/** Um ID salvo: o selo verde, qual é o ID e quando foi salvo. "Trocar o ID" abre o campo. */
export const Conectado: Story = {}

/** A loja que ainda não informou o pixel: para que ele serve e o campo do ID. */
export const NaoConectado: Story = { args: { view: metaPixelDisconnected } }

/** O ID está sendo salvo: o campo travado e o botão ocupado. */
export const Conectando: Story = { args: { view: metaPixelDisconnected, connecting: true } }

/** A recusa em palavras, sob o campo: a da API, quando ela não aceita o que o formulário deixou passar. */
export const IdRecusado: Story = {
  args: { view: metaPixelDisconnected, connectError: "Esse não parece um ID de pixel. O ID tem só números, de 10 a 20 dígitos: copie de novo no Gerenciador de Eventos e cole aqui." },
}

/** O desconectar que não passou. */
export const DesconectarFalhou: Story = { args: { disconnectError: "Não foi possível desconectar agora. Tente de novo." } }

/** O passo a passo de onde copiar o ID e o que é bom saber: o domínio não precisa ser verificado, e os relatórios ficam na Meta. */
export const PassoAPasso: Story = { render: () => <MetaPixelGuide eventsManagerHref={META_EVENTS_MANAGER} /> }

/** O caminho até o relatório de vendas por origem, que funciona com ou sem pixel (BEELINK-275). */
export const VendasPorOrigem: Story = { render: () => <MetaPixelReportLink href="#relatorio" /> }

/**
 * A página como a tela a liga: salvar leva um instante e troca o cartão; desconectar volta ao começo.
 * Cole um trecho de código no campo para ver a recusa, ou o ID com espaços para ver que ele passa.
 */
function Live() {
  const [view, setView] = useState<MetaPixelCardView>(metaPixelDisconnected)
  const [connecting, setConnecting] = useState(false)

  function connect(pixelId: string) {
    setConnecting(true)
    window.setTimeout(() => {
      setConnecting(false)
      setView({ pixelId, connectedAt: new Date().toISOString(), savedAt: "06/10/2026" })
    }, 800)
  }

  return (
    <div className="flex flex-col gap-6">
      {view.pixelId ? <IntegrationsResult tone="done" message="Pixel da Meta conectado: o ID foi salvo." /> : null}
      <MetaPixelCard view={view} logoSrc={META_LOGO} headingAs="h1" onConnect={connect} connecting={connecting} onDisconnect={() => setView(metaPixelDisconnected)} />
      <MetaPixelGuide eventsManagerHref={META_EVENTS_MANAGER} />
    </div>
  )
}

export const AoVivo: Story = { render: () => <Live /> }
