// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { PageDraft, StorePage } from '@harness-monorepo/contracts';

/**
 * Publicar, as the editor presses it: the page's draft frozen and served. A suite that edits a page
 * and then reads the shop as a visitor has to publish in between — that is the whole point of a draft.
 * No page named is the shop's home.
 */
export async function publishPage(app: NestFastifyApplication, accessToken: string, shopSlug: string, pageId?: string): Promise<void> {
  const id = pageId ?? (await homeOf(app, accessToken, shopSlug)).id;
  const response = await app.inject({
    method: 'POST',
    url: `/api/stores/${shopSlug}/pages/${id}/publish`,
    headers: { authorization: `Bearer ${accessToken}` },
    payload: {},
  });

  if (response.statusCode !== 201) throw new Error(`publish answered ${response.statusCode}: ${response.payload}`);
}

/** The page's draft, as the editor reads it. */
export async function draftOf(app: NestFastifyApplication, accessToken: string, shopSlug: string, pageId?: string): Promise<PageDraft> {
  const id = pageId ?? (await homeOf(app, accessToken, shopSlug)).id;
  const response = await app.inject({
    method: 'GET',
    url: `/api/stores/${shopSlug}/pages/${id}/draft`,
    headers: { authorization: `Bearer ${accessToken}` },
  });

  return response.json<PageDraft>();
}

async function homeOf(app: NestFastifyApplication, accessToken: string, shopSlug: string): Promise<StorePage> {
  const pages = await app.inject({
    method: 'GET',
    url: `/api/stores/${shopSlug}/pages`,
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const home = pages.json<StorePage[]>().find((page) => page.kind === 'HOME');
  if (!home) throw new Error(`no home in ${pages.payload}`);
  return home;
}
