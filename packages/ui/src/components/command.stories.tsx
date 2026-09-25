// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// UI
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@harness-monorepo/ui/components/command"

const meta = {
  title: "Primitivos/Command",
  component: Command,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Command>

export default meta
type Story = StoryObj<typeof meta>

/** Uma lista que se filtra ao digitar — as opções prontas de uma variação, por exemplo. */
export const Padrao: Story = {
  render: () => (
    <Command className="w-72 rounded-lg border">
      <CommandInput placeholder="Buscar opção" />
      <CommandList>
        <CommandEmpty>Nada com esse nome.</CommandEmpty>
        <CommandGroup heading="Opções prontas">
          <CommandItem>Sabor</CommandItem>
          <CommandItem>Tamanho</CommandItem>
          <CommandItem>Cor</CommandItem>
          <CommandItem>Peso</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
}
