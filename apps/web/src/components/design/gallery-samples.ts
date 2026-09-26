// Types
import type {
  BenefitRow,
  ContactField,
  FaqItem,
  PublicBannerSlide,
  PublicComponent,
  PublicProductCard,
  PublicSection,
  PublicStore,
} from "@harness-monorepo/contracts"
import type { GalleryEntry } from "@harness-monorepo/ui/blocks/design/section-gallery"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { Shelves } from "./design-draft-preview"

/** What the shop already has to show a section with: its pictures, its products, whether it has categories. */
export interface GalleryStock {
  images: string[]
  products: PublicProductCard[]
  hasCategories: boolean
}

/**
 * The shop's own things, for the gallery's previews: the pictures its banners and products carry
 * and the products its showcases draw. A preview of the shop's own is the point of the gallery —
 * a stock photo would show what the section looks like in someone else's shop.
 */
export function stockOf(store: PublicStore, shelves: Shelves, categoriesShown: number): GalleryStock {
  const seen = new Set<string>()
  const products = [...shelves.values()]
    .flatMap((shelf) => shelf.items as PublicProductCard[])
    .filter((product) => !seen.has(product.id) && seen.add(product.id))
    .slice(0, 8)
  const slides = store.sections
    .flatMap((section) => section.components)
    .filter((component) => component.kind === "BANNER")
    .flatMap((component) => (component.items as PublicBannerSlide[]).map((slide) => slide.imageUrl))
  const images = [...slides, ...products.flatMap((product) => (product.imageUrl ? [product.imageUrl] : []))]

  return { images, products, hasCategories: categoriesShown > 0 }
}

const SPAN = { 1: "FULL", 2: "HALF", 3: "THIRD" } as const

function sample(kind: PublicComponent["kind"], id: string, over: Partial<PublicComponent> = {}): PublicComponent {
  return {
    id,
    kind,
    title: null,
    subtitle: null,
    body: null,
    span: "FULL",
    display: null,
    source: null,
    sourceCategory: null,
    items: [],
    columns: null,
    align: null,
    ...over,
  }
}

/**
 * The band a card of the gallery draws: the section as it would arrive — its opening layout, in a
 * contained band — filled with the shop's own
 * things where it has them and a line of sample copy where a section is words. Null where the shop
 * has nothing to fill it with yet — a banner with no picture, a showcase with no product — and the
 * card keeps its wireframe rather than draw an empty band. The strip is drawn apart, above the header.
 */
export function sampleSectionOf(entry: GalleryEntry, stock: GalleryStock, messages: UiMessages): PublicSection | null {
  const text = messages.design.gallery.samples
  const id = `sample-${entry.kind}-${entry.across}`
  // Contained, as a new band is: what the card shows is what arrives.
  const band = (components: PublicComponent[]): PublicSection => ({
    id,
    name: null,
    width: "CONTAINED",
    background: null,
    components,
  })

  switch (entry.kind) {
    case "BANNER": {
      if (!stock.images.length) return null
      const banners = Array.from({ length: entry.across }, (_, at) => {
        const slide: PublicBannerSlide = {
          id: `${id}-${at}`,
          imageUrl: stock.images[at % stock.images.length]!,
          title: at === 0 ? text.bannerTitle : null,
          subtitle: null,
          href: null,
          external: false,
        }
        return sample("BANNER", `${id}-${at}`, { span: SPAN[entry.across], display: "CAROUSEL", items: [slide] })
      })
      return band(banners)
    }
    case "PRODUCTS":
      return stock.products.length
        ? band([sample("PRODUCTS", id, { display: "RAIL", source: "ALL", items: stock.products.slice(0, 6) })])
        : null
    case "CATEGORIES":
      return stock.hasCategories ? band([sample("CATEGORIES", id, { display: "RAIL" })]) : null
    case "HEADING":
      return band([sample("HEADING", id, { title: text.headingTitle, subtitle: text.headingSubtitle })])
    case "TEXT":
      return band([sample("TEXT", id, { body: text.paragraph })])
    case "BENEFITS": {
      const rows: BenefitRow[] = [
        { id: "shipping", icon: "truck", title: text.benefits.shipping },
        { id: "pix", icon: "qr-code", title: text.benefits.pix },
        { id: "exchange", icon: "refresh-cw", title: text.benefits.exchange },
      ]
      return band([sample("BENEFITS", id, { items: rows })])
    }
    case "CONTACT": {
      // The form a new one opens with (the API's `defaultContactFields`): the name is the form's own
      // first question, and asked here too it would be asked twice.
      const fields: ContactField[] = [
        { id: "email", label: text.contact.email, type: "EMAIL", required: true },
        { id: "telefone", label: text.contact.phone, type: "PHONE", required: true },
        { id: "mensagem", label: text.contact.message, type: "TEXTAREA", required: false },
      ]
      return band([sample("CONTACT", id, { title: text.contactTitle, items: fields })])
    }
    case "FAQ": {
      const items: FaqItem[] = text.faq.map((row, at) => ({ id: `${id}-${at}`, ...row }))
      return band([sample("FAQ", id, { title: text.faqTitle, display: "ACCORDION", items })])
    }
    case "ANNOUNCEMENT":
      return null
  }
}

/** Whether a card has a preview to draw, or keeps its wireframe: decided before any element is made. */
export function previewable(entry: GalleryEntry, stock: GalleryStock, messages: UiMessages): boolean {
  return entry.kind === "ANNOUNCEMENT" || sampleSectionOf(entry, stock, messages) !== null
}
