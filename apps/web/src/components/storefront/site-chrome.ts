// Types
import type { PublicSection, PublicStore } from "@harness-monorepo/contracts"
import type { StorefrontFooterColumn, StorefrontMenuItem } from "@harness-monorepo/ui/blocks/storefront/storefront-window"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { orderHrefOf } from "./storefront-links"

/**
 * The anchor a named band answers to, from its name: "Como funciona" → `#como-funciona`.
 *
 * Built from the name and not from the id, because an anchor is read in the address bar and
 * shared; a uuid there is a uuid a person cannot say. Two bands with one name would collide, so
 * the second and later get the band's id appended — rare, and never a broken link.
 */
export function anchorOf(section: PublicSection, taken: Set<string> = new Set()): string | null {
  const name = section.name?.trim()
  if (!name) return null

  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  const anchor = slug && !taken.has(slug) ? slug : `${slug || "faixa"}-${section.id.slice(0, 8)}`
  taken.add(anchor)

  return anchor
}

/** Every band's anchor, by band id, so the menu and the bands agree on the second "Serviços". */
export function anchorsOf(sections: readonly PublicSection[]): ReadonlyMap<string, string> {
  const taken = new Set<string>()
  const anchors = new Map<string, string>()

  for (const section of sections) {
    const anchor = anchorOf(section, taken)
    if (anchor) anchors.set(section.id, anchor)
  }

  return anchors
}

/**
 * A site's menu: its named bands, in order, as anchors on the same page.
 *
 * The announcement strip's band is never in it — it is drawn above the header, not where it sits
 * — and an unnamed band is a band its owner did not want reachable from the top.
 */
export function menuOf(sections: readonly PublicSection[]): StorefrontMenuItem[] {
  const anchors = anchorsOf(sections)

  return sections
    .filter((section) => !section.components.every((component) => component.kind === "ANNOUNCEMENT"))
    .flatMap((section) => {
      const anchor = anchors.get(section.id)
      return anchor && section.name ? [{ id: section.id, label: section.name.trim(), href: `#${anchor}` }] : []
    })
}

/**
 * A site's footer: the same navigation, and a way to reach a person.
 *
 * The navigation is here as well as in the header on purpose: the header hides its menu on a
 * phone rather than folding it into a drawer, and the footer is where those names are then found.
 */
export function siteFooterColumnsOf(
  store: PublicStore,
  sections: readonly PublicSection[],
  messages: UiMessages,
): StorefrontFooterColumn[] {
  const text = messages.storefront
  const menu = menuOf(sections)
  const whatsapp = orderHrefOf(store)

  return [
    ...(menu.length
      ? [{ id: "navigation", title: text.footerNavigation, items: menu.map(({ label, href }) => ({ label, href })) }]
      : []),
    ...(whatsapp ? [{ id: "contact", title: text.footerContact, items: [{ label: text.networks.whatsapp, href: whatsapp }] }] : []),
  ]
}
