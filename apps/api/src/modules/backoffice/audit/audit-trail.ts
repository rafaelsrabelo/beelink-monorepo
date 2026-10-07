// Types
import type { BackofficeAuditAction } from '@harness-monorepo/contracts';
import type { AuditService } from './audit.service.js';
import type { AuditActor, AuditClient, AuditNote, AuditOrigin, AuditWriter } from './audit.types.js';

/**
 * One request's way to the audit record. `AuditInterceptor` makes it, bound to what the handler
 * declared with `@Audited`, to the address the request came from and to the administrator behind
 * it — so a service says only what it did and to what, and cannot say it of somebody else.
 */
export class AuditTrail implements AuditWriter {
  private count = 0;

  constructor(
    private readonly audit: AuditService,
    private readonly declared: readonly BackofficeAuditAction[],
    private readonly origin: AuditOrigin,
    /** Read when a line is written, not when the trail is made. */
    private readonly requestActor: () => AuditActor,
  ) {}

  /** Whether the handler wrote anything; the interceptor writes the line itself when it did not. */
  get recorded(): boolean {
    return this.count > 0;
  }

  async record(action: BackofficeAuditAction, note: AuditNote = {}, tx?: AuditClient): Promise<void> {
    if (!this.declared.includes(action)) {
      throw new Error(`"${action}" is not an action this handler declared with @Audited (${this.declared.join(', ')})`);
    }

    await this.audit.record({ actor: note.actor ?? this.requestActor(), action, target: note.target, details: note.details, origin: this.origin }, tx);
    this.count += 1;
  }
}
