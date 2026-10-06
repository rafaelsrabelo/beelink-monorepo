// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Locales
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// Block
import { BeeflowBanner } from "./beeflow-banner"

/** A stand-in of the artwork's proportion: the real file is the app's, served by its own image component. */
const art = <img src="https://picsum.photos/seed/beeflow/1600/900" alt={ptBR.integrations.upcoming.beeflow.banner.alt} className="absolute inset-0 size-full object-cover" />

const meta = {
  title: "Blocos/Painel/Início/Banner do BeeFlow",
  component: BeeflowBanner,
  args: { href: "#integracoes", image: art },
} satisfies Meta<typeof BeeflowBanner>

export default meta
type Story = StoryObj<typeof meta>

/** Na largura do conteúdo do painel: a arte inteira, em 16:9, como um link só. */
export const NoPainel: Story = { decorators: [(Story) => <div className="max-w-5xl">{Story()}</div>] }

/** No celular a arte é a mesma, menor: nada é cortado. */
export const NoCelular: Story = { decorators: [(Story) => <div className="w-[358px]">{Story()}</div>] }
