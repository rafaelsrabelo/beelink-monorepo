// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// UI
import { firstListOf } from "@harness-monorepo/ui/lib/markdown"

// Block
import { StorefrontAboutItem } from "./storefront-about-item"

const HAZE = [
  "- **Mais energia** para treinos intensos do começo ao fim.",
  "- **Foco total** para manter a cabeça no treino.",
  "- **Performance máxima** em cada série.",
  "- **Sabor incrível**, fácil de misturar na coqueteleira.",
  "- **Modo de uso:** 1 dosador em 200 ml de água, 30 minutos antes do treino.",
].join("\n")

const meta = {
  title: "Blocos/Vitrine/Sobre este item",
  component: StorefrontAboutItem,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div className="max-w-[452px] text-shop-on-background">{Story()}</div>],
  args: { items: firstListOf(HAZE), moreHref: "#descricao" },
} satisfies Meta<typeof StorefrontAboutItem>

export default meta
type Story = StoryObj<typeof meta>

/** Os tópicos do 5b, com a abertura de cada um em negrito, e o link para a descrição. */
export const Padrao: Story = {}

/** A descrição era só a lista: nada mais a ver, então nenhum link. */
export const SoALista: Story = { args: { moreHref: undefined } }
