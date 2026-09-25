// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@harness-monorepo/ui/components/dialog"

const meta = {
  title: "Primitivos/Dialog",
  component: DialogContent,
  parameters: { layout: "centered" },
} satisfies Meta<typeof DialogContent>

export default meta
type Story = StoryObj<typeof meta>

/** Uma pergunta curta sobre a tela, com o botão de fechar dito no idioma da loja. */
export const Padrao: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>Avise-me</DialogTrigger>
      <DialogContent closeLabel="Fechar">
        <DialogHeader>
          <DialogTitle>Avise-me quando chegar</DialogTitle>
          <DialogDescription>Mandamos uma mensagem no seu WhatsApp.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button>Quero ser avisado</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}
