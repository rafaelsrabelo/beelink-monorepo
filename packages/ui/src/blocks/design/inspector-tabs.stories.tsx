// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"

// Block
import { sampleColorPresets as presets } from "../store/store.fixtures"
import { AlignField } from "./align-field"
import { BandColourField } from "./band-colour-field"
import { ComponentTextFields } from "./component-text-fields"
import { InspectorTabs, type InspectorTab } from "./inspector-tabs"
import type { TextAlign } from "./text-align"

const page = presets[0]!.colors.background
const text = defaultMessages.design

/** The screen's part: it holds the tab and the values. */
function Inspector({ start, alone = false }: { start: InspectorTab; alone?: boolean }) {
  const [tab, setTab] = useState<InspectorTab>(start)
  const [words, setWords] = useState({ title: "Novidades da semana", subtitle: "Chegou agora", body: "" })
  const [align, setAlign] = useState<TextAlign>("CENTER")
  const [colour, setColour] = useState("")

  return (
    <InspectorTabs
      tab={tab}
      onTabChange={setTab}
      name={alone ? "Faixa 2" : words.title}
      {...(alone
        ? {}
        : {
            content: <ComponentTextFields kind="HEADING" value={words} onChange={(next) => setWords({ ...words, ...next })} />,
            layout: <AlignField value={align} onChange={setAlign} />,
          })}
      style={
        <BandColourField
          id="band-background"
          value={colour}
          onChange={setColour}
          pageBackground={page}
          label={text.bandColour}
          noneLabel={text.bandColourNone}
        />
      }
      onSubmit={() => {}}
      onCancel={() => {}}
    />
  )
}

const meta = {
  title: "Blocos/Modo design/Painel em abas",
  component: InspectorTabs,
  parameters: { layout: "padded" },
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

/** Um título escolhido: o que ele diz, como fica e a faixa em que está, sob um Salvar só. */
export const Bloco: Story = {
  args: { tab: "content", onTabChange: () => {}, name: "", style: null, onSubmit: () => {}, onCancel: () => {} },
  render: () => <Inspector start="content" />,
}

/** Uma faixa de vários blocos, escolhida pelo cabeçalho: só o Estilo, sem abas. */
export const FaixaSozinha: Story = {
  args: Bloco.args,
  render: () => <Inspector start="style" alone />,
}
