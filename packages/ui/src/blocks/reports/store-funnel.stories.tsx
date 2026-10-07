// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { cardHeavyFunnel, sampleFunnel } from "./reports.fixtures"
import { ReportsIndex } from "./reports-index"
import { StoreFunnelEmpty } from "./store-funnel-empty"
import { StoreFunnelList } from "./store-funnel-list"
import { StoreFunnelNotes } from "./store-funnel-notes"
import { StoreFunnelRemarks } from "./store-funnel-remarks"
import { StoreFunnelSkeleton } from "./store-funnel-skeleton"

const meta = {
  title: "Blocos/Painel/Relatórios/Funil da loja",
  component: StoreFunnelList,
  args: { steps: sampleFunnel, caption: "Funil da loja, de 07/09/2026 a 06/10/2026" },
} satisfies Meta<typeof StoreFunnelList>

export default meta
type Story = StoryObj<typeof meta>

/** As cinco etapas em ordem: quantas vezes aconteceu, quantas a cada 100 da anterior e quantas ficaram pelo caminho. */
export const Padrao: Story = {}

/** No celular é a mesma lista: tudo empilhado, nada rola para o lado. */
export const NoCelular: Story = { globals: { viewport: { value: "mobile1", isRotated: false } } }

/** São eventos, não pessoas: uma etapa pode passar da anterior, e aí não há queda a dizer. */
export const EtapaMaiorQueAAnterior: Story = { args: { steps: cardHeavyFunnel } }

/** Enquanto a leitura não chega: as cinco etapas no lugar, nunca um spinner. */
export const Carregando: Story = { render: () => <StoreFunnelSkeleton /> }

/** Nenhuma visita contada no período. */
export const Vazio: Story = { render: () => <StoreFunnelEmpty /> }

/** O que o funil deste período deixa de fora: os dias antes da contagem e as vendas do painel. */
export const Ressalvas: Story = { render: () => <StoreFunnelRemarks panelSales={3} countingSince="06/10/2026" /> }

/** O que é bom saber: eventos e não pessoas, compras de verdade, nada identifica o visitante, e por quanto tempo fica guardado. */
export const BomSaber: Story = { render: () => <StoreFunnelNotes retentionMonths={13} /> }

/** A página Relatórios: um cartão por relatório, com uma linha e o caminho. */
export const Indice: Story = {
  render: () => (
    <ReportsIndex
      reports={[
        { title: "Vendas por origem", text: "Quanto a loja vendeu por campanha: de onde veio o cliente de cada pedido.", href: "#origens" },
        { title: "Funil da loja", text: "Onde os clientes desistem: das visitas à compra, etapa por etapa.", href: "#funil" },
      ]}
    />
  ),
}
