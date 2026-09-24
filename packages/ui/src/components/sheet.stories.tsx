// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@harness-monorepo/ui/components/sheet"

const meta = {
  title: "Primitivos/Sheet",
  component: SheetContent,
  parameters: { layout: "centered" },
} satisfies Meta<typeof SheetContent>

export default meta
type Story = StoryObj<typeof meta>

/** Um exemplo de página por trás, para a cortina ter o que cobrir. */
function Fundo() {
  return (
    <div className="flex w-[520px] flex-col gap-3 rounded-xl border p-6">
      <div className="bg-muted h-24 rounded-lg" />
      <div className="bg-muted h-3 w-3/4 rounded" />
      <div className="bg-muted h-3 w-1/2 rounded" />
    </div>
  )
}

/**
 * O padrão: a página atrás escurece e desfoca, dizendo que a gaveta é o assunto agora. É o certo
 * para um formulário sobre uma linha de uma tabela.
 */
export const Padrao: Story = {
  render: () => (
    <div className="relative">
      <Fundo />
      <Sheet defaultOpen>
        <SheetTrigger className="mt-4 underline">Abrir</SheetTrigger>
        <SheetContent side="right" className="sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>Editar linha</SheetTitle>
            <SheetDescription>A página atrás fica em segundo plano.</SheetDescription>
          </SheetHeader>
          <div className="px-4">
            <Button>Salvar</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  ),
}

/**
 * `seeThrough`: a cortina continua ali — é ela que fecha a gaveta num clique fora e mantém o resto
 * da página inerte — mas para de pintar.
 *
 * Existe para o modo design, onde a página atrás **é** o assunto: o lojista edita um bloco olhando
 * para o bloco, e escurecer a prévia esconde o único retorno que o formulário tem.
 */
export const AtravesDaCortina: Story = {
  render: () => (
    <div className="relative">
      <Fundo />
      <Sheet defaultOpen>
        <SheetTrigger className="mt-4 underline">Abrir</SheetTrigger>
        <SheetContent side="right" seeThrough className="sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>Editar bloco</SheetTitle>
            <SheetDescription>A página atrás continua legível.</SheetDescription>
          </SheetHeader>
          <div className="px-4">
            <Button>Salvar</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  ),
}
