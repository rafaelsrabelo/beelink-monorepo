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
} from "@harness-monorepo/ui/components/sheet"

// Data
import palettes from "../store/store-palettes.json"

// Blocks
import { StorefrontSectionBand } from "../storefront/storefront-section-band"
import { BandArrangement } from "./band-arrangement"
import type { ArrangementBand } from "./band-arrangement"
import { DesignBlockPlaceholder } from "./design-block-placeholder"
import { DesignEditTag } from "./design-edit-tag"
import { DesignPreview } from "./design-preview"

/**
 * THE HARNESS. Not a block — the whole design-mode screen, composed from the blocks that build it.
 *
 * It exists because three changes in a row passed 650 component tests and the whole of `ci-check`
 * and still broke the real editor, and every one of them broke in COMPOSITION rather than in a
 * component:
 *
 * - a drawer whose backdrop stopped painting but kept taking the pointer, so the page looked live
 *   and answered nothing;
 * - `scrollIntoView` from inside `DesignPreview`, which paints under `transform: scale()`, so the
 *   browser scrolled an ancestor by an amount that did not match what was on screen;
 * - a placeholder laid out as two columns, dropped into a band a third of the page wide.
 *
 * None of the three is visible to a test that renders one component into an empty document. All
 * three are visible here, because here the scale, the band widths, the panel's real width and the
 * open drawer are all present at once.
 *
 * So: change anything in design mode, then LOOK at these stories. The a11y panel reads the whole
 * composition too, which no single block's story can.
 */
const meta = {
  title: "Blocos/Modo design/A TELA INTEIRA (arnês)",
  parameters: { layout: "fullscreen" },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

/**
 * A shop's colour arrives as data, never as a literal — the same reason `store.fixtures.ts` keeps
 * its sample palettes in a `.json`: a colour written into a `.tsx` is a token that escaped, and
 * `web/no-hex-colors` is right to say so. It caught this file on its first run.
 */
const PRIMARIA = palettes.presets[0].colors.primary

const noop = () => {}

const handlers = {
  onReorder: noop,
  onReorderComponents: noop,
  onToggleBand: noop,
  onEditBand: noop,
  onDeleteBand: noop,
  onToggle: noop,
  onDelete: noop,
  onEdit: noop,
}

const bands: ArrangementBand[] = [
  {
    id: "faixa-1",
    background: null,
    isActive: true,
    components: [
      { id: "c1", kind: "BANNER", title: null, span: "FULL", isActive: true, empty: true },
    ],
  },
  {
    id: "faixa-2",
    background: null,
    isActive: true,
    components: [
      { id: "c2", kind: "PRODUCTS", title: null, span: "FULL", isActive: true, deletable: false },
    ],
  },
  {
    id: "faixa-3",
    background: null,
    isActive: true,
    components: [
      { id: "c3", kind: "BANNER", title: "Frete grátis", span: "THIRD", isActive: true },
      { id: "c4", kind: "BANNER", title: "Pix com desconto", span: "THIRD", isActive: true },
      { id: "c5", kind: "BANNER", title: "Troca fácil", span: "THIRD", isActive: true },
    ],
  },
]

/** Stands in for a drawn block, so the chrome around it is what the story is about. */
function Conteudo({ alto = false }: { alto?: boolean }) {
  return <div className={`bg-muted w-full rounded-lg ${alto ? "h-48" : "h-28"}`} />
}

/** The panel at the width the admin actually gives it. Truncation shows here or nowhere. */
function Painel() {
  return (
    <aside className="flex w-[380px] shrink-0 flex-col gap-3 overflow-y-auto border-l p-4">
      <BandArrangement
        bands={bands}
        {...handlers}
        // Every "+" — between bands, and inside one — is how a block is added, where it lands.
        onInsert={noop}
      />
    </aside>
  )
}

function Tela({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen gap-4 p-4">
      <div className="min-w-0 flex-1 overflow-y-auto rounded-xl border">{children}</div>
      <Painel />
    </div>
  )
}

/**
 * A tela em repouso. Repare no painel: 380px reais, com a galeria, as faixas e os blocos dentro.
 * É aqui que um nome truncado aparece — "Banner" virando "B…" foi relatado desta largura.
 */
export const Padrao: Story = {
  render: () => (
    <Tela>
      <DesignPreview>
        <StorefrontSectionBand primary={PRIMARIA}>
          <DesignEditTag label="Banner" onEdit={noop}>
            <DesignBlockPlaceholder kind="BANNER" label="Banner" />
          </DesignEditTag>
        </StorefrontSectionBand>
        <StorefrontSectionBand primary={PRIMARIA}>
          <DesignEditTag label="Vitrine de produtos" onEdit={noop}>
            <Conteudo alto />
          </DesignEditTag>
        </StorefrontSectionBand>
      </DesignPreview>
    </Tela>
  ),
}

/**
 * **A regressão que shipou.** Três blocos numa faixa de um terço. O lugar de um bloco vazio tem de
 * caber aqui — foi desenhado com duas colunas fixas e não coube.
 */
export const BlocoVazioEmUmTerco: Story = {
  render: () => (
    <Tela>
      <DesignPreview>
        <StorefrontSectionBand primary={PRIMARIA}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(["Frete grátis", "Pix com desconto", "Troca fácil"] as const).map((nome) => (
              <DesignEditTag key={nome} label={nome} onEdit={noop}>
                <DesignBlockPlaceholder kind="BANNER" label={nome} />
              </DesignEditTag>
            ))}
          </div>
        </StorefrontSectionBand>
      </DesignPreview>
    </Tela>
  ),
}

/**
 * **A outra regressão que shipou.** A gaveta aberta sobre a prévia.
 *
 * O que olhar: a página atrás continua legível E clicável? Com a cortina pintando, ela some. Com a
 * cortina transparente mas ainda modal, ela fica visível e morta — que foi relatado como a tela
 * travando. O certo é `seeThrough` junto de `modal={false}`.
 */
export const EditandoComAGavetaAberta: Story = {
  render: () => (
    <>
      <Tela>
        <DesignPreview>
          <StorefrontSectionBand primary={PRIMARIA}>
            <DesignEditTag label="Banner" onEdit={noop} selected>
              <DesignBlockPlaceholder kind="BANNER" label="Banner" />
            </DesignEditTag>
          </StorefrontSectionBand>
          <StorefrontSectionBand primary={PRIMARIA}>
            <DesignEditTag label="Vitrine de produtos" onEdit={noop}>
              <Conteudo alto />
            </DesignEditTag>
          </StorefrontSectionBand>
        </DesignPreview>
      </Tela>
      <Sheet open modal={false}>
        <SheetContent side="right" seeThrough className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Editar bloco</SheetTitle>
            <SheetDescription>Banner</SheetDescription>
          </SheetHeader>
          <div className="px-4">
            <Button>Salvar</Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  ),
}

/** O bloco selecionado, para conferir que a prévia e o painel apontam para a mesma coisa. */
export const BlocoSelecionado: Story = {
  render: () => (
    <Tela>
      <DesignPreview>
        <StorefrontSectionBand primary={PRIMARIA}>
          <DesignEditTag label="Banner do verão" onEdit={noop} selected>
            <Conteudo alto />
          </DesignEditTag>
        </StorefrontSectionBand>
      </DesignPreview>
    </Tela>
  ),
}
