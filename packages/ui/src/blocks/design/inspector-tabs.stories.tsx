// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"

// Block
import { sampleColorPresets as presets } from "../store/store.fixtures"
import { BandStyleFields, type BandFormValues } from "./band-style-fields"
import { ComponentContentFields, contentReady, type ComponentFormValues } from "./component-content-fields"
import { ComponentLayoutFields, type ComponentLayoutValues } from "./component-layout-fields"
import { InspectorTabs, type InspectorTab } from "./inspector-tabs"

const empty: ComponentFormValues = {
  kind: "HEADING",
  title: "",
  subtitle: "",
  body: "",
  target: "NONE",
  categoryId: "",
  productId: "",
  externalUrl: "",
  slides: [],
  benefits: [],
  fields: [],
  source: "ALL",
  sourceCategoryId: "",
  picks: [],
  limit: "",
  faq: [],
  buttonLabel: "",
}

const plainBand: BandFormValues = { name: "", width: "CONTAINED", background: "" }

interface Scenario {
  name: string
  /** Absent for a band chosen on its own. */
  content?: ComponentFormValues
  /** Absent where there is nothing to lay out: the strip, a band on its own. */
  layout?: ComponentLayoutValues
  band: BandFormValues
  strip?: boolean
  sharedWith?: number
}

const scenarios = {
  banner: {
    name: "Banner",
    content: {
      ...empty,
      kind: "BANNER",
      slides: [
        {
          id: "s1",
          imageUrl: "https://picsum.photos/seed/inspector-a/800/400",
          title: "Frete grátis",
          subtitle: "acima de R$ 199",
          target: "CATEGORY",
          categoryId: "cat-1",
          productId: "",
          externalUrl: "",
        },
      ],
    },
    layout: { span: "HALF", display: "CAROUSEL", columns: 0, align: "LEFT", visibleOn: "ALL" },
    band: plainBand,
    sharedWith: 2,
  },
  showcase: {
    name: "Mais vendidos",
    content: { ...empty, kind: "PRODUCTS", title: "Mais vendidos", source: "CATEGORY" },
    layout: { span: "FULL", display: "GRID", columns: 4, align: "LEFT", visibleOn: "ALL" },
    band: { ...plainBand, width: "FULL" },
  },
  heading: {
    name: "Novidades da semana",
    content: { ...empty, title: "Novidades da semana", subtitle: "Chegou agora" },
    layout: { span: "FULL", display: null, columns: 0, align: "CENTER", visibleOn: "ALL" },
    band: { name: "Novidades", width: "CONTAINED", background: presets[1]!.colors.header },
  },
  strip: {
    name: "Frete grátis acima de R$ 199",
    content: { ...empty, kind: "ANNOUNCEMENT", title: "Frete grátis acima de R$ 199" },
    band: { ...plainBand, background: presets[2]!.colors.primary },
    strip: true,
  },
  band: { name: "Faixa 3", band: { ...plainBand, width: "FULL" }, sharedWith: 3 },
} satisfies Record<string, Scenario>

/** The screen's part: it holds the tab and the values, as the editor does. */
function Inspector({ scenario, start }: { scenario: Scenario; start: InspectorTab }) {
  const [tab, setTab] = useState<InspectorTab>(start)
  const [content, setContent] = useState(scenario.content)
  const [layout, setLayout] = useState(scenario.layout)
  const [band, setBand] = useState(scenario.band)

  return (
    <InspectorTabs
      tab={tab}
      onTabChange={setTab}
      name={scenario.name}
      {...(content
        ? {
            content: (
              <ComponentContentFields
                value={content}
                onChange={setContent}
                display={layout?.display ?? null}
                categories={[{ id: "cat-1", name: "Blusas" }]}
                products={[{ id: "prod-1", name: "Whey 900g" }]}
                newItemId={() => `new-${Math.random().toString(36).slice(2, 8)}`}
              />
            ),
          }
        : {})}
      {...(content && layout
        ? {
            layout: (
              <ComponentLayoutFields
                kind={content.kind}
                value={layout}
                onChange={(next) => setLayout({ ...layout, ...next })}
                bandWidth={band.width}
              />
            ),
          }
        : {})}
      style={
        <BandStyleFields
          value={band}
          onChange={setBand}
          {...(scenario.strip ? { strip: true } : {})}
          {...(scenario.sharedWith ? { sharedWith: scenario.sharedWith } : {})}
          pageBackground={presets[0]!.colors.background}
        />
      }
      onSubmit={() => {}}
      onCancel={() => {}}
      submitDisabled={content ? !contentReady(content) : false}
      attention={content && !contentReady(content) ? "content" : null}
    />
  )
}

const meta = {
  title: "Blocos/Modo design/Painel em abas",
  component: InspectorTabs,
  parameters: { layout: "padded" },
  args: { tab: "content", onTabChange: () => {}, name: "", style: null, onSubmit: () => {}, onCancel: () => {} },
  decorators: [
    (Story) => (
      // The editor's right column, at its real width.
      <div className="w-85">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof InspectorTabs>

export default meta
type Story = StoryObj<typeof meta>

/** Um banner numa faixa de dois: as imagens, a fatia e o formato, e a faixa que vale para os dois. */
export const Banner: Story = { render: () => <Inspector scenario={scenarios.banner} start="content" /> }

/** Uma vitrine de uma categoria ainda não escolhida: o Salvar espera, e o Conteúdo fica marcado no Layout. */
export const Vitrine: Story = { render: () => <Inspector scenario={scenarios.showcase} start="layout" /> }

/** Um título numa faixa colorida: o alinhamento está no Layout. */
export const Titulo: Story = { render: () => <Inspector scenario={scenarios.heading} start="layout" /> }

/** A barra de aviso: sem Layout, e o Estilo é só a cor, com as palavras da barra. */
export const BarraDeAviso: Story = { render: () => <Inspector scenario={scenarios.strip} start="style" /> }

/** Uma faixa de três blocos, escolhida pelo cabeçalho: só o Estilo, sem abas. */
export const FaixaSozinha: Story = { render: () => <Inspector scenario={scenarios.band} start="style" /> }
