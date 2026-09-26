// Types
import type { PageStatus } from '@harness-monorepo/contracts';

/** The closed union, as a value the validators can range over. Checked against the contract. */
export const PAGE_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const satisfies readonly PageStatus[];

/** The columns' own lengths, from `page.prisma`. */
export const PAGE_TITLE_MAX_LENGTH = 80;
/** What a search result shows of a title before it cuts it. */
export const PAGE_SEO_TITLE_MAX_LENGTH = 70;
/** What a search result shows of a description before it cuts it. */
export const PAGE_SEO_DESCRIPTION_MAX_LENGTH = 160;
/** What a version's note may say: a line, not a changelog. */
export const PAGE_VERSION_NOTE_MAX_LENGTH = 140;
