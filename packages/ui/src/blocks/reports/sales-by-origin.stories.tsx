// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { ReportPeriodPicker } from "./report-period-picker"
import { awkwardSalesByOrigin, EXAMPLE_URL, sampleSalesByOrigin, sampleSalesTotals } from "./reports.fixtures"
import { SalesByOriginEmpty } from "./sales-by-origin-empty"
import { SalesByOriginNotes } from "./sales-by-origin-notes"
import { SalesByOriginSkeleton } from "./sales-by-origin-skeleton"
import { SalesByOriginCards } from "./sales-by-origin-cards"
import { SalesByOriginTable } from "./sales-by-origin-table"

const meta = {
  title: "Blocos/Painel/Relatórios/Vendas por origem",
  component: SalesByOriginTable,
  args: { rows: sampleSalesByOrigin, totals: sampleSalesTotals, caption: "Vendas por origem, de 07/09/2026 a 06/10/2026" },
} satisfies Meta<typeof SalesByOriginTable>

export default meta
type Story = StoryObj<typeof meta>

/** Uma linha por origem, da que mais vendeu à que menos vendeu, e o total do período embaixo. */
export const Padrao: Story = {}

/** Onde não cabe a tabela, um cartão por origem: o nome na largura toda e os três números embaixo. */
export const NoCelular: Story = { render: (args) => <SalesByOriginCards {...args} />, globals: { viewport: { value: "mobile1", isRotated: false } } }

/** Os cartões com nomes difíceis: texto, inteiro, quebrando em qualquer ponto — no toque não há `title`. */
export const NoCelularNomesDificeis: Story = {
  args: { rows: awkwardSalesByOrigin, totals: { orders: 2, revenueCents: 11980 } },
  render: (args) => <SalesByOriginCards {...args} />,
  globals: { viewport: { value: "mobile1", isRotated: false } },
}

/** O nome da campanha veio de um link: é desenhado como texto, em até duas linhas, com o valor inteiro no `title`. */
export const NomesDificeis: Story = { args: { rows: awkwardSalesByOrigin, totals: { orders: 2, revenueCents: 11980 } } }

/** Um período só com pedidos de total zero: não há fatia a dizer. */
export const SemReceita: Story = {
  args: { rows: [{ kind: "DIRECT", source: null, medium: null, campaign: null, orders: 1, metaAdOrders: 0, revenueCents: 0 }], totals: { orders: 1, revenueCents: 0 } },
}

/** Enquanto a leitura não chega: as linhas no lugar, nunca um spinner. */
export const Carregando: Story = { render: () => <SalesByOriginSkeleton /> }

/** Nenhuma venda no período: diz isso e como uma origem passa a ser registrada. */
export const Vazio: Story = { render: () => <SalesByOriginEmpty exampleUrl={EXAMPLE_URL} /> }

/** Os atalhos de período são links: o período fica no endereço da página. */
export const Periodo: Story = {
  render: () => <ReportPeriodPicker current={30} options={[7, 30, 90].map((days) => ({ days, href: `?period=${days}` }))} />,
}

/** O que é bom saber, embaixo da tabela; com o link de exemplo quando o estado vazio não o mostrou. */
export const BomSaber: Story = { render: () => <SalesByOriginNotes exampleUrl={EXAMPLE_URL} /> }
