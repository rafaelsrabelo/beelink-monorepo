// Libs
import { ChevronRightIcon, PlusIcon, Trash2Icon } from "lucide-react"
import type { Meta, StoryObj } from "@storybook/react-vite"

// UI
import { Button } from "@harness-monorepo/ui/components/button"

const meta = {
  title: "Primitivos/Button",
  component: Button,
  parameters: { layout: "centered" },
  args: { children: "Salvar" },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Variantes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Button>Salvar</Button>
      <Button variant="outline">Cancelar</Button>
      <Button variant="secondary">Depois</Button>
      <Button variant="ghost">Fechar</Button>
      <Button variant="destructive">Excluir</Button>
      <Button variant="link">Saiba mais</Button>
    </div>
  ),
}

export const Tamanhos: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm">Pequeno</Button>
      <Button>Padrão</Button>
      <Button size="lg">Grande</Button>
      <Button size="icon" aria-label="Adicionar">
        <PlusIcon />
      </Button>
    </div>
  ),
}

/**
 * Sem animação de afundar ao pressionar.
 *
 * O estilo `base-nova` empurrava o botão um pixel para baixo enquanto pressionado, e com a
 * transição na base isso vira um
 * ícone que desce e sobe a cada clique. Num botão com rótulo passa por resposta ao toque; num
 * botão só de ícone — as setas do trilho da vitrine, o lápis e a lixeira da tabela — lê como
 * falha. Foi removido no primitivo em vez de sobrescrito por fora: uma tentativa de anular pela
 * `className` perdeu a cascata — a regra da base saía depois no CSS gerado e carregava um `:not()`
 * a mais de especificidade — e `styling.md` manda editar o primitivo, não brigar com ele.
 *
 * O nome daquela classe não aparece em lugar nenhum deste arquivo de propósito. O Tailwind varre
 * texto, não código: escrevê-la num comentário a fazia voltar ao CSS servido depois de removida.
 */
export const IconesNaoAfundam: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Button size="icon" variant="outline" aria-label="Próximos">
        <ChevronRightIcon />
      </Button>
      <Button size="icon" variant="ghost" aria-label="Excluir">
        <Trash2Icon />
      </Button>
      <Button variant="outline">Segure para comparar</Button>
    </div>
  ),
}

export const Desabilitado: Story = { args: { disabled: true } }
