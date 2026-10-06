// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

// Locales
import { en } from "../../locales/en"

// Block
import { TemplateGallery } from "./template-gallery"
import { HOME_TEMPLATES, LANDING_TEMPLATES, PRODUCTS, samplePreview } from "./template-gallery.fixtures"
import { TemplatePreviewFrame } from "./template-preview-frame"

const meta = {
  title: "Blocos/Modo design/Galeria de modelos",
  component: TemplateGallery,
  parameters: { layout: "fullscreen" },
  args: {
    open: true,
    onOpenChange: fn(),
    state: "ready",
    templates: HOME_TEMPLATES,
    selectedId: null,
    onSelect: fn(),
    renderPreview: samplePreview,
  },
} satisfies Meta<typeof TemplateGallery>

export default meta
type Story = StoryObj<typeof meta>

/** A inicial de uma loja: quatro modelos, um indicado, nenhum escolhido ainda. */
export const PaginaInicial: Story = {}

/** Um modelo escolhido: a página inteira ao lado dos cartões (no celular, no lugar deles). */
export const ModeloEscolhido: Story = { args: { selectedId: "vitrine-com-capa" } }

/** Uma landing: três modelos pedem um produto, e a busca aparece acima dos cartões. */
export const LandingSemProduto: Story = {
  args: {
    templates: LANDING_TEMPLATES,
    product: { options: PRODUCTS, state: "ready", selectedId: null, onPick: fn() },
    renderPreview: (template, size) =>
      template.needsProduct ? <TemplatePreviewFrame state="needsProduct" size={size} /> : samplePreview(template, size),
  },
}

/** A mesma landing com o produto escolhido. */
export const LandingComProduto: Story = {
  args: { templates: LANDING_TEMPLATES, product: { options: PRODUCTS, state: "ready", selectedId: "p1", onPick: fn() } },
}

/** Os modelos a caminho. */
export const Carregando: Story = { args: { state: "loading", templates: [] } }

/** A lista não pôde ser lida. */
export const Falha: Story = { args: { state: "failed", templates: [], onRetry: fn() } }

/** Nenhum modelo vale para a página. */
export const Vazio: Story = { args: { templates: [] } }

/** Cada cartão tem o seu estado: um carregando, um que falhou, os outros desenhados. */
export const PreviasEmCadaEstado: Story = {
  args: {
    renderPreview: (template, size) =>
      template.id === "ofertas" ? (
        <TemplatePreviewFrame state="loading" size={size} />
      ) : template.id === "por-categorias" ? (
        <TemplatePreviewFrame state="failed" size={size} onRetry={fn()} />
      ) : (
        samplePreview(template, size)
      ),
  },
}

export const EmIngles: Story = { args: { messages: en, selectedId: "ofertas" } }

/** Com `onApply`, a prévia grande ganha "Usar este modelo"; a tela pergunta antes de aplicar. */
export const ComAplicar: Story = { args: { selectedId: "vitrine-com-capa", onApply: fn() } }

/** Um modelo de produto sem produto escolhido: o botão espera, e diz o que falta. */
export const AplicarEsperaProduto: Story = {
  args: {
    templates: LANDING_TEMPLATES,
    selectedId: "lancamento",
    onApply: fn(),
    applyBlocked: "Escolha um produto para usar este modelo.",
    product: { options: PRODUCTS, state: "ready", selectedId: null, onPick: fn() },
    renderPreview: (template, size) =>
      template.needsProduct ? <TemplatePreviewFrame state="needsProduct" size={size} /> : samplePreview(template, size),
  },
}
