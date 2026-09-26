// Types
import type { PublicSection, PublicStore } from "@harness-monorepo/contracts"
import type { StorefrontFooterColumn, StorefrontMenuItem } from "@harness-monorepo/ui/blocks/storefront/storefront-window"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { drawnSectionsOf } from "./empty-component"
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
 * The named bands a visitor can jump to, in order, as anchors: the ones the page draws, so no link
 * points at a band left out for having nothing to show. Anchors are counted over every band, as the
 * page counts them, so a name keeps its anchor.
 *
 * `base` is the page the bands are on, when it is not this one: a landing's menu leads back to the
 * home's bands, at `/<shop>#servicos`, and a bare `#servicos` there would go nowhere.
 */
function namedBandsOf(sections: readonly PublicSection[], base = ""): StorefrontMenuItem[] {
  const anchors = anchorsOf(sections)

  return drawnSectionsOf(sections, false)
    .flatMap((section) => {
      const anchor = anchors.get(section.id)
      return anchor && section.name ? [{ id: section.id, label: section.name.trim(), href: `${base}#${anchor}` }] : []
    })
}

/** The landings the shop links from its menu and footer, each at its own address. */
export function pageLinksOf(store: PublicStore, landing: (pageSlug: string) => string): StorefrontMenuItem[] {
  return (store.pages ?? []).map((page) => ({ id: `page-${page.slug}`, label: page.title, href: landing(page.slug) }))
}

/**
 * A site's button: the first named band holding a contact form, by its own name.
 *
 * No column says "this is the button" — the band's name is its label, so an owner who wants it to
 * read "Pedir orçamento" renames the band, and the menu, the anchor and the button follow.
 */
export function ctaOf(sections: readonly PublicSection[], base = ""): { label: string; href: string } | null {
  const holdsForm = new Set(
    sections.filter((section) => section.components.some((component) => component.kind === "CONTACT")).map((s) => s.id),
  )
  const band = namedBandsOf(sections, base).find((entry) => holdsForm.has(entry.id))

  return band ? { label: band.label, href: band.href } : null
}

/**
 * A site's menu: its named bands, as anchors — less the one the button already leads to, which
 * would otherwise sit in the header twice. An unnamed band is one its owner did not want reachable.
 */
export function menuOf(sections: readonly PublicSection[], base = ""): StorefrontMenuItem[] {
  const cta = ctaOf(sections, base)

  return namedBandsOf(sections, base).filter((entry) => entry.href !== cta?.href)
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
  { base = "", pages = [] }: { base?: string; pages?: readonly StorefrontMenuItem[] } = {},
): StorefrontFooterColumn[] {
  const text = messages.storefront
  // Every named band, the button's included: the header hides its menu on a phone, and this is
  // where those names are found. Then the landings, which are pages of their own.
  const menu = [...namedBandsOf(sections, base), ...pages]
  const whatsapp = orderHrefOf(store)

  return [
    ...(menu.length
      ? [{ id: "navigation", title: text.footerNavigation, items: menu.map(({ label, href }) => ({ label, href })) }]
      : []),
    ...(whatsapp ? [{ id: "contact", title: text.footerContact, items: [{ label: text.networks.whatsapp, href: whatsapp }] }] : []),
  ]
}
