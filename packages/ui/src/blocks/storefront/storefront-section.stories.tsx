import type { Meta, StoryObj } from "@storybook/react-vite"

import { StorefrontSection } from "./storefront-section"

const products = ["Bolsa Amora", "Bolsa Serena", "Necessaire Luna", "Chaveiro Flor", "Carteira Ipê"]

/** Stand-in for whatever the home runs inside a band — the band itself lays out nothing. */
function Rail() {
  return (
    <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4">
      {products.map((name) => (
        <li key={name} className="w-36 shrink-0 snap-start">
          <div className="aspect-square w-full rounded-lg bg-black/5" />
          <p className="mt-2 text-sm font-medium">{name}</p>
        </li>
      ))}
    </ul>
  )
}

const meta = {
  title: "Blocos/Vitrine/Faixa",
  component: StorefrontSection,
  parameters: { layout: "padded" },
  args: {
    title: "Destaques",
    moreHref: "/lessari/produtos",
    children: <Rail />,
  },
} satisfies Meta<typeof StorefrontSection>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

export const ComDescricao: Story = {
  args: { description: "O que mais sai desta semana, escolhido pela loja." },
}

/** Nowhere to send them yet: the band keeps its heading and drops the link. */
export const SemPagina: Story = {
  args: { moreHref: undefined },
}

/** A band nested under another one. The level moves; the heading does not change size. */
export const DentroDeOutraFaixa: Story = {
  args: { headingLevel: 3 },
}

/**
 * The whole point of the prop: the home is one `<h1>` — the shop's name — and every band under it
 * is an `<h2>`. Open the a11y panel and read the outline, which is the part this block exists for.
 */
export const UmaHomeInteira: Story = {
  args: { title: "Destaques" },
  render: (args) => (
    <div className="flex flex-col gap-10">
      <h1 className="text-2xl font-semibold">Lessari</h1>
      <StorefrontSection {...args} />
      <StorefrontSection title="Categorias" moreHref="/lessari/categorias">
        <ul className="flex gap-3 overflow-x-auto">
          {["Mais vendidos", "Novidades", "Promoções"].map((name) => (
            <li key={name} className="shrink-0 rounded-full border border-current/20 px-3 py-1.5 text-xs">
              {name}
            </li>
          ))}
        </ul>
      </StorefrontSection>
    </div>
  ),
}

/** The visible words are the band's to choose; the accessible name stays "Ver tudo em {section}". */
export const ComOutroConvite: Story = {
  args: { moreLabel: "Ver a loja inteira" },
}
