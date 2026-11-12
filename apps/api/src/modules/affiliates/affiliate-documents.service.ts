// Nest
import { BadGatewayException, Injectable, Logger, NotFoundException, NotImplementedException, PayloadTooLargeException, UnsupportedMediaTypeException } from '@nestjs/common';

// Types
import type { AffiliateDocumentUpload, AffiliateDocumentView, ShopAffiliate } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { CloudinaryPrivateAssets } from '../uploads/cloudinary-private-assets.js';
import { StoresService } from '../stores/stores.service.js';
import { claimDocument } from './affiliate-document-claims.js';
import { affiliateOf } from './affiliate-records.js';
import { DOCUMENT_FOLDER, DOCUMENT_LINK_TTL_MS, DOCUMENT_MAX_BYTES, DOCUMENT_TYPES, affiliateError } from './affiliates.constants.js';
import { affiliateInclude, toShopAffiliate } from './affiliates.mapper.js';
import type { AffiliateDocumentDto } from './dto/affiliate-commission.dto.js';

/** The uploads' own codes, which the web already has a sentence for. */
const notConfigured = () => new NotImplementedException({ errorCode: 'UPLOAD_NOT_CONFIGURED', message: 'No storage is configured for documents' });
const unavailable = () => new BadGatewayException({ errorCode: 'BAD_GATEWAY', message: 'The storage service did not answer' });

/**
 * An affiliate's identity document (the user's review, 12/11/2026): its photos kept at Cloudinary as
 * authenticated assets, under a folder of the shop's, and read by the shop's owner alone through
 * links this API signs and that stop working within minutes. No id, address or byte of them is ever
 * logged, nor put in any other answer: the record says only the type, and whether there is a back.
 */
@Injectable()
export class AffiliateDocumentsService {
  private readonly logger = new Logger(AffiliateDocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
    private readonly assets: CloudinaryPrivateAssets,
  ) {}

  /** The shop the photo is for, and that there is somewhere to keep it — both before a byte is read. */
  async ready(storeSlug: string, userId: string): Promise<string> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    if (!this.assets.config()) throw notConfigured();
    return storeId;
  }

  /** One photo, kept and waiting for an invite or a record to name it within a day. */
  async stage(storeId: string, file: { bytes: Buffer; type: string; filename: string }): Promise<AffiliateDocumentUpload> {
    const stored = await this.assets.upload(file, `${DOCUMENT_FOLDER}/${storeId}`, { types: DOCUMENT_TYPES, maxBytes: DOCUMENT_MAX_BYTES });
    switch (stored.status) {
      case 'uploaded': {
        const row = await this.prisma.affiliateDocumentUpload.create({ data: { storeId, publicId: stored.publicId, format: stored.format }, select: { id: true } });
        return { id: row.id };
      }
      case 'not-configured':
        throw notConfigured();
      case 'unsupported':
        throw new UnsupportedMediaTypeException({ errorCode: 'UNSUPPORTED_MEDIA_TYPE', message: 'A document is a JPEG, PNG or WebP photo, or a PDF' });
      case 'too-large':
        throw new PayloadTooLargeException({ errorCode: 'PAYLOAD_TOO_LARGE', message: 'That photo is over the size limit' });
      case 'unavailable':
        throw unavailable();
    }
  }

  /** The photos, at links that work for ten minutes. The shop's owner alone. */
  async read(storeSlug: string, userId: string, affiliateId: string): Promise<AffiliateDocumentView> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const affiliate = await affiliateOf(this.prisma, storeId, affiliateId);
    const document = await this.prisma.affiliateDocument.findUnique({ where: { affiliateId: affiliate.id } });
    if (!document) throw new NotFoundException(affiliateError('AFFILIATE_DOCUMENT_NOT_FOUND', 'This affiliate has no document'));

    const now = new Date();
    const expiresAt = new Date(now.getTime() + DOCUMENT_LINK_TTL_MS);
    const frontUrl = await this.assets.downloadUrl(document.frontPublicId, document.frontFormat, expiresAt, now);
    const backUrl = document.backPublicId && document.backFormat ? await this.assets.downloadUrl(document.backPublicId, document.backFormat, expiresAt, now) : null;
    if (!frontUrl) throw notConfigured();
    return { type: document.type, frontUrl, frontFormat: document.frontFormat, backUrl, backFormat: document.backFormat, expiresAt: expiresAt.toISOString(), uploadedAt: document.updatedAt.toISOString() };
  }

  /** A document sent, or sent again: the photos before it are deleted once the new ones are in. */
  async replace(storeSlug: string, userId: string, affiliateId: string, dto: AffiliateDocumentDto): Promise<ShopAffiliate> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const affiliate = await affiliateOf(this.prisma, storeId, affiliateId);
    const before = await this.filesOf(affiliate.id);

    const row = await this.prisma.$transaction(async (tx) => {
      const document = await claimDocument(tx, storeId, dto, new Date());
      await tx.affiliateDocument.upsert({ where: { affiliateId: affiliate.id }, create: { affiliateId: affiliate.id, ...document }, update: document });
      return tx.affiliate.findUniqueOrThrow({ where: { id: affiliate.id }, include: affiliateInclude });
    });

    await this.discard(before);
    return toShopAffiliate(row);
  }

  /** The ids of an affiliate's photos, to delete once the rows that name them are gone. */
  async filesOf(affiliateId: string): Promise<string[]> {
    const document = await this.prisma.affiliateDocument.findUnique({ where: { affiliateId }, select: { frontPublicId: true, backPublicId: true } });
    return document ? [document.frontPublicId, ...(document.backPublicId ? [document.backPublicId] : [])] : [];
  }

  /** Deleted at Cloudinary, best effort: a file left behind is logged by count, never by name. */
  async discard(publicIds: readonly string[]): Promise<void> {
    if (publicIds.length === 0) return;
    const results = await Promise.all(publicIds.map((publicId) => this.assets.destroy(publicId)));
    const left = results.filter((gone) => !gone).length;
    if (left > 0) this.logger.warn({ left }, "Some photos of an affiliate's document were not deleted at Cloudinary");
  }
}
