// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type { ContactFieldType, Lead, LeadAnswer, LeadPage, LeadStatus } from '@harness-monorepo/contracts';

// App
import { CONTACT_FIELD_TYPES } from '../../page/page.constants.js';
import { LEAD_STATUSES } from '../leads.constants.js';

/**
 * The shapes out, for Swagger. Each `implements` its contract type, so a field added to the wire
 * and forgotten here fails to compile rather than going missing from /api/docs.
 */
export class LeadAnswerResponse implements LeadAnswer {
  @ApiProperty() fieldId!: string;
  @ApiProperty({ description: 'The label the question had when it was answered.' }) label!: string;
  @ApiProperty({ enum: CONTACT_FIELD_TYPES }) type!: ContactFieldType;
  @ApiProperty() value!: string;
}

export class LeadResponse implements Lead {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid', nullable: true, type: String, description: 'Null once the form was deleted.' })
  componentId!: string | null;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, type: String }) email!: string | null;
  @ApiProperty({ nullable: true, type: String, description: 'Digits only.' }) phone!: string | null;
  @ApiProperty({ type: [LeadAnswerResponse] }) answers!: LeadAnswerResponse[];
  @ApiProperty({ enum: LEAD_STATUSES }) status!: LeadStatus;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class LeadPageResponse implements LeadPage {
  @ApiProperty({ type: [LeadResponse] }) leads!: LeadResponse[];
  @ApiProperty({ description: 'How many match, across every page.' }) total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
