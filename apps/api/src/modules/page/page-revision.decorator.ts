// Nest
import { BadRequestException, createParamDecorator, type ExecutionContext } from '@nestjs/common';

// Types
import type { FastifyRequest } from 'fastify';

// App
import { PAGE_REVISION_HEADER } from './pages.constants.js';
import { pageError } from './page.rules.js';

/** The largest value the `draftRevision` column holds. */
const INT4_MAX = 2_147_483_647;

/**
 * The draft revision the editor read, from `x-page-revision`, or undefined when it sent none — an
 * old tab, a script, a test — which is not checked. A header and not a body field: a delete has no
 * body, and the bodies it would join are refused for any key they do not declare.
 */
export const PageRevision = createParamDecorator((_data: unknown, context: ExecutionContext): number | undefined => {
  const raw = context.switchToHttp().getRequest<FastifyRequest>().headers[PAGE_REVISION_HEADER];
  if (raw === undefined) return undefined;

  // Digits only, and within the column's int4: `1e3` and `0x10` are not revisions, and a value past
  // the column would fail the raw cast as a 500 rather than be refused as what it is.
  const value = Array.isArray(raw) ? raw[0] : raw;
  const revision = value && /^\d{1,10}$/.test(value) ? Number(value) : Number.NaN;
  if (!(revision <= INT4_MAX)) {
    throw new BadRequestException(pageError('PAGE_REVISION_INVALID', 'The page revision is a whole number'));
  }

  return revision;
});

/** How Swagger documents the header on the routes that read it. */
export const PAGE_REVISION_DOC = {
  name: PAGE_REVISION_HEADER,
  required: false,
  description: 'The draft revision the editor read. A write is refused (409 PAGE_DRAFT_STALE) when another landed since.',
};
