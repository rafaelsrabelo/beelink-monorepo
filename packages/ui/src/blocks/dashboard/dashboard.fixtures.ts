// Block
import type { ChartPoint } from "./chart-area-interactive"
import type { DashboardCard, DashboardNavItem, DashboardUser } from "./dashboard-types"

/** Fixtures for stories and tests. The app owns the content it actually renders. */
export const sampleUser: DashboardUser = {
  name: "Ana Souza",
  email: "ana@exemplo.com",
}

export const sampleNavMain: DashboardNavItem[] = [
  { title: "Painel", href: "/dashboard" },
  { title: "Relatórios", href: "/relatorios" },
  { title: "Equipe", href: "/equipe" },
]

export const sampleNavSecondary: DashboardNavItem[] = [
  { title: "Configurações", href: "/configuracoes" },
  { title: "Ajuda", href: "/ajuda" },
]

export const sampleCards: DashboardCard[] = [
  { label: "Receita total", value: "R$ 1.250,00", trend: "+12,5%", footnote: "Comparado ao mês passado" },
  { label: "Novas contas", value: "1.234", trend: "-20%", footnote: "Queda no período" },
  { label: "Contas ativas", value: "45.678", trend: "+12,5%", footnote: "Retenção acima da meta" },
  { label: "Crescimento", value: "4,5%", trend: "+4,5%", footnote: "Dentro da projeção" },
]

/** Ninety days of made-up traffic, enough for every range the chart offers. */
export const sampleChartData: ChartPoint[] = Array.from({ length: 90 }, (_, index) => {
  const date = new Date(Date.UTC(2026, 3, 1 + index))
  return {
    date: date.toISOString().slice(0, 10),
    desktop: 180 + ((index * 37) % 320),
    mobile: 120 + ((index * 53) % 260),
  }
})
