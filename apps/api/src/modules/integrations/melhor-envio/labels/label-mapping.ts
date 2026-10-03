// Nest
import { BadGatewayException, ConflictException } from '@nestjs/common';

// Types
import type { LabelErrorCode, LabelRefusedDetails, OrderLabel, OrderLabelVolume } from '@harness-monorepo/contracts';
import type { OrderLabelModel } from '../../../../generated/prisma/models.js';

// App
import { integrationError } from '../../integrations.constants.js';
import { MelhorEnvioRefused, MelhorEnvioUnreachable } from '../melhor-envio.client.js';

/** Melhor Envio's own site, where the shopkeeper adds to the wallet: the address of the wallet's page is not documented. */
export const DEFAULT_SITE = 'https://melhorenvio.com.br';

export function labelError(errorCode: LabelErrorCode, message: string, details?: unknown) {
  return { errorCode, message, ...(details === undefined ? {} : { details }) };
}

export function volumeOf(row: OrderLabelModel): OrderLabelVolume {
  return { weightGrams: row.weightGrams, lengthMm: row.lengthMm, widthMm: row.widthMm, heightMm: row.heightMm };
}

export function labelOf(row: OrderLabelModel): OrderLabel {
  return {
    status: row.status,
    protocol: row.protocol,
    priceCents: row.priceCents,
    volume: volumeOf(row),
    invoiceKey: row.invoiceKey,
    trackingCode: row.trackingCode,
    createdAt: row.createdAt.toISOString(),
    paidAt: row.paidAt?.toISOString() ?? null,
    generatedAt: row.generatedAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
  };
}

export const sameVolume = (one: OrderLabelVolume, other: OrderLabelVolume) =>
  one.weightGrams === other.weightGrams && one.lengthMm === other.lengthMm && one.widthMm === other.widthMm && one.heightMm === other.heightMm;

/** Melhor Envio's no, in its own words, or not knowing: the two are said apart. */
export function translated(error: unknown): unknown {
  if (error instanceof MelhorEnvioRefused) return new ConflictException(labelError('LABEL_REFUSED', 'Melhor Envio refused the label', { reason: error.reason } satisfies LabelRefusedDetails));
  if (error instanceof MelhorEnvioUnreachable) return new BadGatewayException(integrationError('INTEGRATION_UNREACHABLE', 'Melhor Envio did not answer'));
  return error;
}
