// Nest
import { BadRequestException, NotFoundException } from '@nestjs/common';

// Types
import type { AffiliateDocumentPayload, AffiliateDocumentType } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { DOCUMENT_UPLOAD_TTL_MS, affiliateError } from './affiliates.constants.js';

/** A document's photos as kept: their Cloudinary ids and formats. Never an address. */
export interface ClaimedDocument {
  type: AffiliateDocumentType;
  frontPublicId: string;
  frontFormat: string;
  backPublicId: string | null;
  backFormat: string | null;
}

/**
 * The photos an invite or a record names, taken out of waiting inside the caller's transaction: they
 * must be this shop's, unused, and younger than a day. Two requests naming the same photo at once —
 * the second deletes nothing and is refused, and its transaction rolls back with it.
 */
export async function claimDocument(tx: Prisma.TransactionClient, storeId: string, document: AffiliateDocumentPayload, now: Date): Promise<ClaimedDocument> {
  if (document.type !== 'PASSPORT' && document.backUploadId === null) {
    throw new BadRequestException(affiliateError('AFFILIATE_DOCUMENT_INVALID', 'This document has a back to send'));
  }
  const frontId = document.frontUploadId.toLowerCase();
  const backId = document.backUploadId?.toLowerCase() ?? null;
  if (backId === frontId) throw new BadRequestException(affiliateError('AFFILIATE_DOCUMENT_INVALID', 'The front and the back are one photo'));

  const ids = backId ? [frontId, backId] : [frontId];
  const since = new Date(now.getTime() - DOCUMENT_UPLOAD_TTL_MS);
  const rows = await tx.affiliateDocumentUpload.findMany({ where: { id: { in: ids }, storeId, createdAt: { gt: since } } });
  const taken = await tx.affiliateDocumentUpload.deleteMany({ where: { id: { in: rows.map((row) => row.id) } } });
  if (rows.length !== ids.length || taken.count !== ids.length) {
    throw new NotFoundException(affiliateError('AFFILIATE_DOCUMENT_UPLOAD_NOT_FOUND', 'A photo is not an unused upload of this shop'));
  }

  const front = rows.find((row) => row.id === frontId)!;
  const back = backId ? rows.find((row) => row.id === backId)! : null;
  return { type: document.type, frontPublicId: front.publicId, frontFormat: front.format, backPublicId: back?.publicId ?? null, backFormat: back?.format ?? null };
}
