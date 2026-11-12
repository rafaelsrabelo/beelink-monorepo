// Types
import type { AffiliateDocumentPayload } from '@harness-monorepo/contracts';

// App
import type { PrismaService } from '../../src/shared/prisma/prisma.service.js';

/*
  What an invite must carry since the user's review of 12/11/2026: a phone and a CPF. Each call
  hands a pair no other call in the run has — a CPF is unique in a shop among the affiliates not
  ended — and a phone in area code 21, which no customer the suites register uses, so an affiliate
  is never taken for a buyer unless a test says so.
*/

let next = 100_000_000;

/** Eleven digits that are a CPF: nine from the counter, then the two check digits. */
function cpfOf(nine: string): string {
  const check = (digits: string) => {
    let sum = 0;
    for (let index = 0; index < digits.length; index += 1) sum += Number(digits[index]) * (digits.length + 1 - index);
    return ((sum * 10) % 11) % 10;
  };
  const ten = `${nine}${check(nine)}`;
  return `${ten}${check(ten)}`;
}

export function affiliateIdentity(): { phone: string; cpf: string } {
  next += 1;
  const nine = String(next).padStart(9, '0');
  return { phone: `(21) 9${nine.slice(1, 5)}-${nine.slice(5)}`, cpf: cpfOf(nine) };
}

/**
 * What an invite must carry since the user's review of 12/11/2026, beside the phone and the CPF: an
 * identity document — here, two photos written straight as waiting uploads of the shop, as if sent a
 * moment ago, so no suite needs a storage account. `store` is the shop's slug, or a URL under it.
 */
export async function affiliateDocumentFor(prisma: PrismaService, store: string): Promise<AffiliateDocumentPayload> {
  const slug = /\/api\/stores\/([^/]+)\//.exec(store)?.[1] ?? store;
  const { id: storeId } = await prisma.store.findUniqueOrThrow({ where: { slug }, select: { id: true } });
  next += 1;
  const front = await prisma.affiliateDocumentUpload.create({ data: { storeId, publicId: `test/${storeId}/front-${next}`, format: 'jpg' } });
  const back = await prisma.affiliateDocumentUpload.create({ data: { storeId, publicId: `test/${storeId}/back-${next}`, format: 'jpg' } });
  return { type: 'RG', frontUploadId: front.id, backUploadId: back.id };
}
