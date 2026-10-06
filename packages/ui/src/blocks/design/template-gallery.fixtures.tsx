// React
import type { ReactNode } from "react"

// Block
import type { GalleryTemplate, TemplatePreviewSize } from "./template-gallery"
import { TemplatePreviewFrame } from "./template-preview-frame"

/** A shop's home: the four of its own, one suggested for its category. */
export const HOME_TEMPLATES: GalleryTemplate[] = [
  { id: "ofertas", recommended: true, needsProduct: false },
  { id: "vitrine-com-capa", recommended: false, needsProduct: false },
  { id: "por-categorias", recommended: false, needsProduct: false },
  { id: "catalogo-enxuto", recommended: false, needsProduct: false },
]

/** A shop's landing: three built around a product, and the blank one. */
export const LANDING_TEMPLATES: GalleryTemplate[] = [
  { id: "lancamento", recommended: false, needsProduct: true },
  { id: "promocao-relampago", recommended: false, needsProduct: true },
  { id: "colecao", recommended: false, needsProduct: true },
  { id: "em-branco", recommended: false, needsProduct: false },
]

export const PRODUCTS = [
  { id: "p1", name: "Bolsa de couro" },
  { id: "p2", name: "Relógio clássico" },
]

/** Stands for the shop's renderer, which this package does not have: a page of grey bands with the model's id. */
export function samplePreview(template: GalleryTemplate, size: TemplatePreviewSize): ReactNode {
  return (
    <TemplatePreviewFrame state="ready" size={size}>
      <div data-testid={`preview-${size}-${template.id}`} className="flex flex-col gap-3 p-4">
        <div className="bg-primary/15 text-primary grid h-28 place-items-center rounded-md text-sm font-semibold">{template.id}</div>
        <div className="bg-muted h-10 rounded-md" />
        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((card) => (
            <div key={card} className="bg-muted h-24 rounded-md" />
          ))}
        </div>
        {/* What a real preview holds and must not hand the keyboard: a link and a field. */}
        <a href="#produto">Ver produto</a>
        <input aria-label="E-mail" />
      </div>
    </TemplatePreviewFrame>
  )
}
