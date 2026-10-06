// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

// Block
import { TemplateAppliedNotice } from "./template-applied-notice"

const meta = {
  title: "Blocos/Modo design/Modelo aplicado",
  component: TemplateAppliedNotice,
  parameters: { layout: "fullscreen" },
  args: { templateName: "Vitrine com capa", problems: [], onPublish: fn(), onDismiss: fn() },
} satisfies Meta<typeof TemplateAppliedNotice>

export default meta
type Story = StoryObj<typeof meta>

/** O modelo entrou no rascunho e não deixou nada a conferir. */
export const SemProblemas: Story = {}

/** A página ainda está sendo conferida. */
export const Conferindo: Story = { args: { problems: null } }

/** Uma loja sem produto: a vitrine do modelo não tem o que mostrar. */
export const ComProblemas: Story = {
  args: {
    problems: [
      { kind: "SHOWCASE_EMPTY", blockName: "Todos os produtos", bandName: "Faixa 3" },
      { kind: "BANNER_WITHOUT_IMAGE", blockName: "Banner", bandName: "Faixa 1" },
    ],
  },
}

/** A conferência falhou: o aviso continua dizendo o que foi feito. */
export const ConferenciaFalhou: Story = { args: { problems: null, checkFailed: true } }
