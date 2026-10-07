import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { categoryBannerArt } from "./category-art.fixtures"
import { StorefrontBreadcrumb } from "./storefront-breadcrumb"
import { StorefrontCategoryBanner } from "./storefront-category-banner"
import { StorefrontResultsBand } from "./storefront-results-band"
import { StorefrontResultsCount } from "./storefront-results-count"
import { StorefrontSort } from "./storefront-sort"

const meta = {
  title: "Blocos/Vitrine/Faixa de resultados",
  component: StorefrontResultsBand,
  parameters: { layout: "fullscreen" },
  decorators: [(Story) => <div style={shopPaletteStyle(sampleColorPresets[2]!.colors)}>{Story()}</div>],
} satisfies Meta<typeof StorefrontResultsBand>

export default meta
type Story = StoryObj<typeof meta>

/** A faixa de 5a: trilha, título, contagem com o termo buscado e a ordenação. */
export const Busca: Story = {
  args: {
    heading: "Pré-treino",
    breadcrumb: <StorefrontBreadcrumb homeHref="#" items={[{ label: "Produtos", href: "#" }, { label: "Pré-treino" }]} />,
    summary: <StorefrontResultsCount page={1} pageSize={16} total={86} term="pré-treino" locale="pt-BR" />,
    children: (
      <StorefrontSort
        action="#"
        name="ordenar"
        value="relevancia"
        options={[
          { value: "relevancia", label: "Mais relevantes" },
          { value: "menor-preco", label: "Menor preço" },
          { value: "maior-preco", label: "Maior preço" },
          { value: "maior-desconto", label: "Maior desconto" },
          { value: "novidades", label: "Lançamentos" },
        ]}
      />
    ),
  },
}

/** Uma página sem prateleira, como Categorias: só a trilha e o título. */
export const SoTitulo: Story = {
  args: { heading: "Categorias", breadcrumb: <StorefrontBreadcrumb homeHref="#" items={[{ label: "Categorias" }]} /> },
}

/** A página de uma categoria com banner próprio: a arte larga entre a trilha e o título, em 4:1. */
export const CategoriaComBanner: Story = {
  args: {
    heading: "Ferramentas",
    breadcrumb: <StorefrontBreadcrumb homeHref="#" items={[{ label: "Produtos", href: "#" }, { label: "Ferramentas" }]} />,
    banner: <StorefrontCategoryBanner imageUrl={categoryBannerArt("Ferramentas Elétricas", "seagreen")} />,
    summary: <StorefrontResultsCount page={1} pageSize={16} total={86} locale="pt-BR" />,
  },
}

/** A mesma página no celular: a mesma proporção, a arte inteira. */
export const CategoriaComBannerNoCelular: Story = {
  ...CategoriaComBanner,
  globals: { viewport: { value: "mobile2", isRotated: false } },
}
