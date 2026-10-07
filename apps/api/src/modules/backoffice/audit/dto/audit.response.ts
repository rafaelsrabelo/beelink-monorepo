// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type { BackofficeAuditAction, BackofficeAuditActorKind, BackofficeAuditDetails, BackofficeAuditEntry, BackofficeAuditPage, BackofficeAuditTargetType } from '@harness-monorepo/contracts';

// App
import { BACKOFFICE_AUDIT_ACTIONS, BACKOFFICE_AUDIT_ACTOR_KINDS, BACKOFFICE_AUDIT_TARGET_TYPES } from '../audit.actions.js';

export class BackofficeAuditActorResponse implements Readonly<BackofficeAuditEntry['actor']> {
  @ApiProperty({ enum: BACKOFFICE_AUDIT_ACTOR_KINDS })
  kind!: BackofficeAuditActorKind;

  @ApiProperty({ format: 'uuid', nullable: true, type: String, description: 'Null for the command and for a refused sign-in.' })
  userId!: string | null;

  @ApiProperty({ nullable: true, type: String, description: "The administrator's e-mail as it was then." })
  label!: string | null;
}

export class BackofficeAuditTargetResponse implements Readonly<NonNullable<BackofficeAuditEntry['target']>> {
  @ApiProperty({ enum: BACKOFFICE_AUDIT_TARGET_TYPES })
  type!: BackofficeAuditTargetType;

  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true, type: String })
  label!: string | null;
}

export class BackofficeAuditEntryResponse implements BackofficeAuditEntry {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: BackofficeAuditActorResponse })
  actor!: BackofficeAuditActorResponse;

  @ApiProperty({ enum: BACKOFFICE_AUDIT_ACTIONS })
  action!: BackofficeAuditAction;

  @ApiProperty({ type: BackofficeAuditTargetResponse, nullable: true })
  target!: BackofficeAuditTargetResponse | null;

  @ApiProperty({ type: 'object', additionalProperties: true, description: 'Flat and small; never a secret.' })
  details!: BackofficeAuditDetails;

  @ApiProperty({ nullable: true, type: String, description: "The client's address as the API saw it." })
  ip!: string | null;

  @ApiProperty({ nullable: true, type: String })
  userAgent!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

export class BackofficeAuditPageResponse implements BackofficeAuditPage {
  @ApiProperty({ type: [BackofficeAuditEntryResponse] })
  entries!: BackofficeAuditEntryResponse[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;
}
