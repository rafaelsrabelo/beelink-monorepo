// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// UI
import { Label } from "@harness-monorepo/ui/components/label"
import { RadioGroup, RadioGroupItem } from "@harness-monorepo/ui/components/radio-group"

const meta = {
  title: "Primitivos/RadioGroup",
  component: RadioGroup,
  parameters: { layout: "centered" },
} satisfies Meta<typeof RadioGroup>

export default meta
type Story = StoryObj<typeof meta>

/** Uma escolha entre poucas — a ordenação de uma listagem, por exemplo. */
export const Padrao: Story = {
  render: () => (
    <RadioGroup defaultValue="relevancia" aria-label="Ordenar por">
      {[
        ["relevancia", "Mais relevantes"],
        ["menor-preco", "Menor preço"],
        ["maior-preco", "Maior preço"],
      ].map(([value, label]) => (
        <div key={value} className="flex items-center gap-2">
          <RadioGroupItem id={`ordem-${value}`} value={value!} />
          <Label htmlFor={`ordem-${value}`}>{label}</Label>
        </div>
      ))}
    </RadioGroup>
  ),
}
