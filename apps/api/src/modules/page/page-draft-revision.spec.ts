// Nest
import { ConflictException } from '@nestjs/common';

// Types
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { checkDraft, touchDraft } from './page-draft-revision.js';

function tx(changed: number, draftRevision = 4) {
  return {
    $executeRaw: vi.fn().mockResolvedValue(changed),
    storePage: { findUniqueOrThrow: vi.fn().mockResolvedValue({ draftRevision }) },
  } as unknown as Prisma.TransactionClient & { $executeRaw: ReturnType<typeof vi.fn> };
}

describe('touchDraft', () => {
  it('bumps the revision, checked against the one sent', async () => {
    const client = tx(1);

    await touchDraft(client, 'page', 4);

    const [, pageId, expected] = client.$executeRaw.mock.calls[0]!;
    expect([pageId, expected]).toEqual(['page', 4]);
  });

  it('bumps without checking when none was sent', async () => {
    const client = tx(1);

    await touchDraft(client, 'page');

    expect(client.$executeRaw.mock.calls[0]![2]).toBeNull();
  });

  it('refuses with PAGE_DRAFT_STALE when another write landed since', async () => {
    await expect(touchDraft(tx(0), 'page', 3)).rejects.toMatchObject({ response: { errorCode: 'PAGE_DRAFT_STALE' } });
    await expect(touchDraft(tx(0), 'page', 3)).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('checkDraft', () => {
  it('lets the revision seen through, and refuses another, without writing', async () => {
    await expect(checkDraft(tx(1, 4), 'page', 4)).resolves.toBeUndefined();
    await expect(checkDraft(tx(1, 5), 'page', 4)).rejects.toMatchObject({ response: { errorCode: 'PAGE_DRAFT_STALE' } });
    await expect(checkDraft(tx(1, 5), 'page')).resolves.toBeUndefined();
  });
});
