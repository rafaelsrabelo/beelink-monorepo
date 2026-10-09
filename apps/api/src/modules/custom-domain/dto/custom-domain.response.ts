// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type {
  CustomDomain,
  CustomDomainCheck,
  CustomDomainDnsProblem,
  CustomDomainEntry,
  CustomDomainOverview,
  CustomDomainProblem,
  CustomDomainStatus,
  CustomDomainWwwCheck,
  PublicCustomDomain,
} from '@harness-monorepo/contracts';

// App
import { CUSTOM_DOMAIN_PROBLEMS, CUSTOM_DOMAIN_STATUSES } from '../custom-domain.constants.js';

const DNS_PROBLEMS = ['DNS_NOT_FOUND', 'DNS_POINTS_ELSEWHERE', 'DNS_LOOKUP_FAILED'] as const satisfies readonly CustomDomainDnsProblem[];

/** Documents the shapes for Swagger; the wire types themselves live in packages/contracts. */

export class PublicCustomDomainResponse implements PublicCustomDomain {
  @ApiProperty({ example: 'minhaloja.com.br', description: 'The bare host: lower case, no scheme, no `www.`, no port.' }) host!: string;
  @ApiProperty({ enum: CUSTOM_DOMAIN_STATUSES, description: 'ACTIVE once its DNS points here and it answered over HTTPS.' }) status!: CustomDomainStatus;
}

export class CustomDomainResponse extends PublicCustomDomainResponse implements CustomDomain {
  @ApiProperty({ nullable: true, type: String, format: 'date-time', description: 'When it was last checked; null when it never was.' }) checkedAt!: string | null;
  @ApiProperty({ nullable: true, enum: CUSTOM_DOMAIN_PROBLEMS, description: 'What the last check found wrong. An ACTIVE domain may carry one: it stays active.' })
  problem!: CustomDomainProblem | null;
}

export class CustomDomainWwwCheckResponse implements CustomDomainWwwCheck {
  @ApiProperty({ nullable: true, enum: DNS_PROBLEMS }) problem!: CustomDomainDnsProblem | null;
  @ApiProperty({ type: [String], example: ['203.0.113.10'] }) addresses!: string[];
}

export class CustomDomainCheckResponse implements CustomDomainCheck {
  @ApiProperty({ nullable: true, enum: CUSTOM_DOMAIN_PROBLEMS, description: 'What keeps the domain from opening the shop; null when nothing does.' })
  problem!: CustomDomainProblem | null;
  @ApiProperty({ type: [String], example: ['203.0.113.10'], description: "The host's A records as found — where DNS_POINTS_ELSEWHERE points." }) addresses!: string[];
  @ApiProperty({ type: CustomDomainWwwCheckResponse, description: '`www.<host>`, checked apart: a warning, never what keeps the domain pending.' })
  www!: CustomDomainWwwCheckResponse;
}

export class CustomDomainOverviewResponse implements CustomDomainOverview {
  @ApiProperty({ nullable: true, type: [String], example: ['203.0.113.10'], description: "The addresses the domain's A record points at. Null where this deployment names none: nothing can be saved or checked." })
  targetIps!: string[] | null;
  @ApiProperty({ nullable: true, type: CustomDomainResponse, description: 'Null while the shop has none.' }) domain!: CustomDomainResponse | null;
  @ApiProperty({ nullable: true, type: CustomDomainCheckResponse, description: 'The check this very answer ran; null on a plain read.' }) check!: CustomDomainCheckResponse | null;
}

export class CustomDomainEntryResponse implements CustomDomainEntry {
  @ApiProperty({ example: 'minhaloja.com.br' }) host!: string;
  @ApiProperty({ example: 'minha-loja', description: "The shop's slug." }) slug!: string;
  @ApiProperty({ enum: CUSTOM_DOMAIN_STATUSES }) status!: CustomDomainStatus;
}
