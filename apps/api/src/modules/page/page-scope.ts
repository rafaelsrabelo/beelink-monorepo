// Nest
import { BadRequestException, NotFoundException } from '@nestjs/common';

// Types
import type { ComponentKind, PageKind } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { pageError } from './page.rules.js';

/** Any version: the ids are uuid v7, and the check is only that Postgres could read one. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PageInScope {
  id: string;
  kind: PageKind;
}

/**
 * The page a collection route acts on: the one named, or the shop's home when none is — so every
 * call made before a shop could have pages still reaches the page it always did.
 *
 * A page that is not this shop's answers as one that is not there, like a band or a block.
 */
export async function pageFor(db: Prisma.TransactionClient, storeId: string, pageId?: string): Promise<PageInScope> {
  if (pageId !== undefined && !UUID.test(pageId)) {
    throw new NotFoundException(pageError('PAGE_NOT_FOUND', `No page ${pageId} in this shop`));
  }

  const page = await db.storePage.findFirst({
    where: pageId === undefined ? { storeId, kind: 'HOME' } : { id: pageId, storeId },
    select: { id: true, kind: true },
  });

  if (!page) throw new NotFoundException(pageError('PAGE_NOT_FOUND', `No page ${pageId ?? 'home'} in this shop`));
  return page;
}

/**
 * The strip above the header is the shop's, drawn from its home on every page: a landing does not
 * hold one of its own, and one added there would draw nowhere.
 */
export function refuseOnLanding(pageKind: PageKind, kind: ComponentKind): void {
  if (pageKind === 'LANDING' && kind === 'ANNOUNCEMENT') {
    throw new BadRequestException(pageError('COMPONENT_KIND_HOME_ONLY', 'A barra de aviso fica na página inicial.'));
  }
}

/**
 * A block stays on its page: the editor never offers another page's band, and a block moved there
 * would leave the page it was arranged on without a word. Answered as a band that is not here.
 */
export function refuseOtherPage(from: string, to: { pageId: string }, sectionId: string): void {
  if (to.pageId !== from) {
    throw new NotFoundException(pageError('SECTION_NOT_FOUND', `No band ${sectionId} on this page`));
  }
}
