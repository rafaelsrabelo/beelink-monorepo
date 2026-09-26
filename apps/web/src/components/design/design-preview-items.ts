// Types
import type {
  AnnouncementLink,
  BannerSlide,
  CallToActionButton,
  ComponentKind,
  PublicComponentItem,
  StoreComponent,
} from "@harness-monorepo/contracts"

// App
import type { Shelves } from "./design-draft-preview"

/**
 * A block's items as the preview draws them, built from what the panel saved.
 *
 * A banner's slides arrive from the panel carrying ids, and the shop window is served them carrying
 * addresses. The preview builds the second shape from the first with no address at all, and loses
 * nothing by it: every link in the preview is inert by construction — the pane renders an href-less
 * anchor and swallows the click. The picture, the words and the order are what is being arranged,
 * and all three are here.
 */
export function previewItemsOf(
  component: { id: string; kind: ComponentKind },
  was: StoreComponent | undefined,
  shelves: Shelves,
): PublicComponentItem[] {
  switch (component.kind) {
    case "BANNER":
      return ((was?.items ?? []) as BannerSlide[]).map((slide) => ({
        id: slide.id,
        imageUrl: slide.imageUrl,
        title: slide.title ?? null,
        subtitle: slide.subtitle ?? null,
        href: null,
        external: false,
      }))
    case "ANNOUNCEMENT":
      return ((was?.items ?? []) as AnnouncementLink[]).map((link) => ({ id: link.id, href: null, external: false }))
    // An address the preview has no use for: its link is inert, and the button draws where it will be.
    case "CALL_TO_ACTION":
      return ((was?.items ?? []) as CallToActionButton[]).map((button) => ({ id: button.id, label: button.label, href: "#", external: false }))
    // What a showcase stores is the ids it picked, never the cards a visitor is served; the cards are
    // the public read's to resolve. A showcase saved since the page loaded keeps the cards it had
    // then until the next load.
    case "PRODUCTS":
      return shelves.get(component.id)?.items ?? []
    default:
      return (was?.items ?? []) as PublicComponentItem[]
  }
}
