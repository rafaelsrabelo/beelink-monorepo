// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

// Locales
import { en } from "../../locales/en"

// Block
import { DesignSelectionBar } from "./design-selection-bar"

const meta = {
  title: "Blocos/Modo design/Barra da seleção",
  component: DesignSelectionBar,
  parameters: { layout: "centered" },
  args: {
    label: "Banner 1",
    canMoveUp: true,
    canMoveDown: true,
    onMoveUp: fn(),
    onMoveDown: fn(),
    onDuplicate: fn(),
    onToggleHidden: fn(),
    onDelete: fn(),
  },
} satisfies Meta<typeof DesignSelectionBar>

export default meta
type Story = StoryObj<typeof meta>

/** Um banner escolhido no preview: subir, descer, trocar o formato, ocultar e excluir. */
export const Banner: Story = {
  args: { layouts: ["CAROUSEL", "GRID"], layout: "CAROUSEL", onLayout: fn() },
}

/** A cópia está a caminho: Duplicar espera, e um clique duplo faz uma cópia só. */
export const Duplicando: Story = {
  args: { duplicating: true },
}

/** A barra de aviso é uma só: não se duplica. */
export const BarraDeAviso: Story = {
  args: { label: "Barra de aviso", onDuplicate: undefined, canMoveUp: false, canMoveDown: false },
}

/** A primeira faixa não sobe; um título não tem formato para trocar. */
export const NoTopo: Story = {
  args: { label: "Título", canMoveUp: false },
}

/** A última vitrine da loja não pode ser excluída: a lixeira não aparece. */
export const UltimaVitrine: Story = {
  args: { label: "Vitrine de produtos", layouts: ["RAIL", "GRID"], layout: "RAIL", onLayout: fn(), onDelete: undefined },
}

export const Oculto: Story = {
  args: { hidden: true },
}

export const EmIngles: Story = {
  args: { layouts: ["CAROUSEL", "GRID"], layout: "GRID", onLayout: fn(), messages: en },
}
