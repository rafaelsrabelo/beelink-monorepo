// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// UI
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@harness-monorepo/ui/components/accordion"

const meta = {
  title: "Primitivos/Accordion",
  component: Accordion,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Accordion>

export default meta
type Story = StoryObj<typeof meta>

/** Perguntas que se abrem uma de cada vez — a descrição e as especificações do produto, por exemplo. */
export const Padrao: Story = {
  render: () => (
    <Accordion className="w-80">
      <AccordionItem value="descricao">
        <AccordionTrigger>Descrição</AccordionTrigger>
        <AccordionContent>Whey protein concentrado, 900 g, sabor chocolate.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="especificacoes">
        <AccordionTrigger>Especificações</AccordionTrigger>
        <AccordionContent>30 doses de 30 g. Contém leite.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}
