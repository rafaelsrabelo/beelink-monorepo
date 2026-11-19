// Types
import type { AffiliateStatus } from "./affiliate.js";
import type { PublicAffiliateJoinBanner } from "./page-items.js";

/**
 * A shop's "Seja afiliado" page and the applications it takes (plan 2026-11-14--afiliados-candidatura-publica):
 * a visitor comes in from a banner of the shop, reads the page the shop wrote and applies with a short
 * form; the shopkeeper approves, and the invite that already exists goes out.
 *
 * Every text of the page is the shop's. A field left `null` is the product's own text, in the web's
 * locale, so a better default reaches every shop that wrote none. Two marks work in any text: `{loja}`,
 * the shop's name, and `{comissao}`, the general rate of the table the page announces ("10%").
 */

/** One step of "how it works". Title 1 to 60 characters, text 1 to 240. */
export interface AffiliatePageStep {
  title: string;
  text: string;
}

/** One benefit of joining. Title 1 to 60 characters, text 1 to 240. */
export interface AffiliatePageBenefit {
  title: string;
  text: string;
}

/** One question of the page's FAQ. Question 1 to 120 characters, answer 1 to 600. */
export interface AffiliatePageQuestion {
  question: string;
  answer: string;
}

/** What the shop writes of its page. Every text is trimmed, and a blank one is `null`. */
export interface AffiliatePageContent {
  /** The small label above the title, up to 40 characters. */
  badge: string | null;
  /** Up to 120 characters. */
  title: string | null;
  /** Up to 300 characters. */
  subtitle: string | null;
  /** The button that opens the form, up to 40 characters. */
  ctaLabel: string | null;
  /** Up to 3, each 1 to 60 characters; `null` is the product's three, `[]` none. */
  highlights: string[] | null;
  /** An image the shop uploaded, drawn beside the title; `null` draws how an affiliate's link looks. */
  imageUrl: string | null;
  /** The heading of "how it works", up to 60 characters. */
  stepsTitle: string | null;
  /** 1 to 4; `null` is the product's three. */
  steps: AffiliatePageStep[] | null;
  /** 0 to 6; `null` is the product's four, `[]` none. */
  benefits: AffiliatePageBenefit[] | null;
  /** The heading of the FAQ, up to 60 characters. */
  questionsTitle: string | null;
  /** 0 to 10; `null` is the product's five, `[]` none. */
  questions: AffiliatePageQuestion[] | null;
  /** The call at the page's foot: a title up to 120 characters and a text up to 240. */
  closingTitle: string | null;
  closingText: string | null;
  /** The form's heading, up to 60 characters, and the line under it, up to 160. */
  formTitle: string | null;
  formSubtitle: string | null;
  /** Whether the form asks one more question, optional to whoever fills it in. */
  askExtraQuestion: boolean;
  /** That question, up to 80 characters; `null` is the product's ("Onde você vai divulgar?"). */
  extraQuestion: string | null;
  /** What the visitor reads once the form went, up to 400 characters. */
  successMessage: string | null;
  /** The banner on the shop's home: a title up to 80 characters, a text up to 160, a button up to 40. */
  bannerTitle: string | null;
  bannerText: string | null;
  bannerCta: string | null;
}

/**
 * Where the shop window leads to the page. None of them is drawn under an affiliate's name. A banner
 * is not one of them: it is a block of design mode, "Programa de afiliados", that the shopkeeper puts
 * where they want (plan 2026-11-19).
 */
export interface AffiliatePagePlacements {
  /** "Seja afiliado" among the footer's links. */
  footerLink: boolean;
  /** A thin strip above every page of the shop. */
  topStrip: boolean;
}

/** `MANUAL`: the shopkeeper approves each application. `AUTO`: every application becomes an invite at once. */
export type AffiliateApprovalMode = "MANUAL" | "AUTO";

/** The page as its owner edits it. */
export interface AffiliatePageSettings {
  /** Whether the page takes applications. Off until the shopkeeper opens it. */
  open: boolean;
  placements: AffiliatePagePlacements;
  /** The table the page announces and approvals start from; `null` is the shop's default table. */
  tableId: string | null;
  approval: AffiliateApprovalMode;
  content: AffiliatePageContent;
  /** ISO-8601; `null` while never saved. */
  updatedAt: string | null;
}

/** What `PUT /stores/:slug/affiliate-page` takes: the whole of it. */
export type AffiliatePagePayload = Omit<AffiliatePageSettings, "updatedAt">;

/**
 * Why visitors do not see the page: the shopkeeper has not opened it, the programme is off, or this
 * deployment does not take affiliates in yet — the privacy policy that tells of them is unpublished.
 */
export type AffiliatePageBlock = "CLOSED" | "PROGRAM_OFF" | "LINKS_OFF";

/** `GET /stores/:slug/affiliate-page`. */
export interface AffiliatePageOverview {
  page: AffiliatePageSettings;
  /** `null` when visitors see the page now. */
  blockedBy: AffiliatePageBlock | null;
  /** The announced table's general rate, in basis points: what `{comissao}` becomes. */
  rateBps: number;
  /** The highest rate a product on sale earns on that table: above `rateBps`, `{comissao}` is "até" it. */
  maxRateBps: number;
  /** Applications waiting on the shopkeeper. */
  pendingApplications: number;
}

/**
 * What every page of the shop window knows of the affiliate page (`PublicStore.affiliatePage`): where it
 * leads to it and the banner's words. Absent or `null` whenever visitors do not see the page.
 */
export interface PublicAffiliatePagePlacement extends PublicAffiliateJoinBanner {
  placements: AffiliatePagePlacements;
}

/** `GET /stores/:slug/affiliate-page/public`: the page as a visitor reads it, with the programme's terms. */
export interface PublicAffiliatePage {
  content: AffiliatePageContent;
  rateBps: number;
  maxRateBps: number;
  /** The shop's terms as they stand; null text when it wrote none. */
  terms: { text: string | null; version: number };
}

/** What `POST /stores/:slug/affiliate-applications` takes. */
export interface AffiliateApplicationPayload {
  /** 2 to 120 characters, trimmed. */
  name: string;
  email: string;
  /** Any way a person writes it; kept as digits with the country code. */
  phone: string;
  /** The answer to the page's extra question, up to 200 characters; null when not asked or not answered. */
  extraAnswer: string | null;
  /** The terms and the privacy policy read: always `true`, or the application is refused. */
  accepted: true;
  /** A field no person sees. Anything in it, and nothing is kept — the answer is the same. */
  website?: string;
}

/** Where an application stands: waiting on the shopkeeper, made an invite, or turned down. */
export type AffiliateApplicationStatus = "PENDING" | "APPROVED" | "REFUSED";

/** An application as the shop's list shows it. Decided ones are deleted 90 days after the decision. */
export interface ShopAffiliateApplication {
  id: string;
  name: string;
  /** Lower case. */
  email: string;
  /** Digits only, with the country code. */
  phone: string;
  /** The extra question as the page asked it then: null when it was the product's own, or none was asked. */
  extraQuestion: string | null;
  /** Its answer; null when not asked or left blank. */
  extraAnswer: string | null;
  status: AffiliateApplicationStatus;
  /** ISO-8601. */
  createdAt: string;
  /** ISO-8601; null while pending. */
  decidedAt: string | null;
  /** The affiliate an approval invited, and where they stand now; null otherwise, or once they are gone. */
  affiliate: { id: string; status: AffiliateStatus } | null;
}

/** `GET /stores/:slug/affiliate-applications`: newest first. */
export interface ShopAffiliateApplicationPage {
  applications: ShopAffiliateApplication[];
  total: number;
  page: number;
  pageSize: number;
  /** Applications waiting, whatever the filter. */
  pendingCount: number;
}

/** What `POST …/affiliate-applications/:id/approve` takes: the table to invite on, else the one the page announces. */
export interface AffiliateApplicationApproval {
  tableId?: string;
}

/** `details` of `AFFILIATE_APPLICATION_DECIDED`. */
export interface AffiliateApplicationDecidedDetails {
  status: AffiliateApplicationStatus;
}
