// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { OptionSearch } from "./option-search"

const options = [
  { id: "1", name: "Blusas" },
  { id: "2", name: "Calças" },
  { id: "3", name: "Acessórios" },
  { id: "4", name: "Calçados" },
]

const meta = {
  title: "Blocos/Modo design/Busca de opção",
  component: OptionSearch,
  parameters: { layout: "padded" },
  args: {
    id: "busca",
    label: "Categoria",
    placeholder: "Buscar categoria",
    options,
    emptyText: "Nada com esse nome.",
    onPick: () => {},
  },
} satisfies Meta<typeof OptionSearch>

export default meta
type Story = StoryObj<typeof meta>

/** Uma escolha só: a marcada aparece destacada. Digite "calca" para achar as duas com cedilha. */
export const EscolherUma: Story = { args: { selectedId: "2" } }

/** Para adicionar a uma lista: o que já está nela some, e cada botão diz "Adicionar". */
export const Adicionar: Story = { args: { exclude: ["1"], actionLabel: "Adicionar {name}" } }
