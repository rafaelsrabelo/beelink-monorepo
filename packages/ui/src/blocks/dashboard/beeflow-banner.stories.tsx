// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Locales
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// Block
import { BeeflowBanner } from "./beeflow-banner"

/** A stand-in of the artwork's proportion: the real file is the app's, served by its own image component. */
const SRC = "https://picsum.photos/seed/beeflow/2103/748"
const art = <img src={SRC} alt={ptBR.integrations.upcoming.beeflow.banner.alt} className="absolute inset-0 size-full object-contain" />
const backdrop = <img src={SRC} alt="" className="absolute inset-0 size-full object-fill" />

const meta = {
  title: "Blocos/Painel/Início/Banner do BeeFlow",
  component: BeeflowBanner,
  args: { href: "#integracoes", image: art, backdrop },
} satisfies Meta<typeof BeeflowBanner>

export default meta
type Story = StoryObj<typeof meta>

/** Na largura do conteúdo do painel: a arte inteira, numa faixa baixa, como um link só. */
export const NoPainel: Story = { decorators: [(Story) => <div className="max-w-5xl">{Story()}</div>] }

/** Num monitor largo a faixa para de crescer em 320px: a arte inteira no centro, as bordas dela estendidas até as laterais. */
export const NoMonitorLargo: Story = { decorators: [(Story) => <div className="w-[1632px]">{Story()}</div>] }

/** No celular a arte é a mesma, menor: nada é cortado. */
export const NoCelular: Story = { decorators: [(Story) => <div className="w-[358px]">{Story()}</div>] }
