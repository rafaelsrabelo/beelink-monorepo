// Nest
import { Injectable, Logger } from '@nestjs/common';

// Libs
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';

// Types
import type { ProductImportDraft } from '@harness-monorepo/contracts';
import type { ProductImportType } from './product-import.constants.js';

// App
import { env } from '../../shared/config/env.js';
import { draftsFrom, extractionSchema } from './product-import.drafts.js';
import { instructionFor, PRODUCT_IMPORT_SYSTEM } from './product-import.prompt.js';

export interface ImportFile {
  bytes: Buffer;
  type: ProductImportType;
}

/**
 * How a read ended, without an exception for the two outcomes that are not a fault of this API:
 * a document with nothing in it to sell, and a reader that did not answer. The service turns each
 * into its own code, the way `CloudinaryService.upload` answers a status rather than throwing.
 */
export type ReadOutcome =
  | { status: 'read'; drafts: ProductImportDraft[] }
  | { status: 'unreadable' }
  | { status: 'unavailable' };

/**
 * A menu's tables are plain reading; `medium` is the model's default named out loud, so a model
 * swapped in through `PRODUCT_IMPORT_MODEL` keeps reading with the same care.
 */
const EFFORT = 'medium';

/**
 * Room for a hundred products with descriptions and options, and for the thinking before them.
 * Streamed, so a large ceiling costs nothing until it is used and no request times out holding it.
 */
const MAX_TOKENS = 64_000;

/**
 * The one place this API talks to Claude.
 *
 * The client is built once, with the key handed to it from `env` — never left to the SDK to find in
 * the environment on its own — so the key is read where every other key is (rule 3) and a
 * deployment without one has no client at all. One retry and three minutes: the shopkeeper is waiting on this answer with the page open.
 */
@Injectable()
export class ProductImportReader {
  private readonly logger = new Logger(ProductImportReader.name);
  private readonly client = env.ANTHROPIC_API_KEY
    ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 1, timeout: 3 * 60 * 1000 })
    : null;

  configured(): boolean {
    return this.client !== null;
  }

  async read(file: ImportFile, categoryNames: readonly string[]): Promise<ReadOutcome> {
    if (!this.client) return { status: 'unavailable' };

    const data = file.bytes.toString('base64');
    const document =
      file.type === 'application/pdf'
        ? ({ type: 'document', source: { type: 'base64', media_type: file.type, data } } as const)
        : ({ type: 'image', source: { type: 'base64', media_type: file.type, data } } as const);

    try {
      const message = await this.client.beta.messages
        .stream({
          model: env.PRODUCT_IMPORT_MODEL,
          max_tokens: MAX_TOKENS,
          // A declined read is retried by the API on the model it chooses for that kind of decline,
          // inside the same call; a model with no fallbacks simply runs alone.
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          output_config: { effort: EFFORT, format: betaZodOutputFormat(extractionSchema) },
          system: PRODUCT_IMPORT_SYSTEM,
          messages: [{ role: 'user', content: [document, { type: 'text', text: instructionFor(categoryNames) }] }],
        })
        .finalMessage();

      // A refusal, or a list cut off at the ceiling, is not a list to show: half a menu reviewed
      // as if it were all of it is worse than asking for a shorter document.
      if (message.stop_reason !== 'end_turn' || !message.parsed_output) {
        this.logger.warn({ stopReason: message.stop_reason, model: message.model }, 'The menu was not read to the end');
        return { status: 'unreadable' };
      }

      const drafts = draftsFrom(message.parsed_output.products);
      this.logger.log(
        { model: message.model, drafts: drafts.length, inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens },
        'A menu was read',
      );

      return drafts.length > 0 ? { status: 'read', drafts } : { status: 'unreadable' };
    } catch (error) {
      return this.outcomeOf(error);
    }
  }

  /**
   * A 400 is the document's — a password, a corrupt file, more pages than the model takes. Anything
   * else the API answered, or a connection that never got an answer, is the reader being away.
   */
  private outcomeOf(error: unknown): ReadOutcome {
    if (error instanceof Anthropic.BadRequestError) {
      this.logger.warn({ status: error.status, requestId: error.requestID }, 'Claude refused the document');
      return { status: 'unreadable' };
    }
    if (error instanceof Anthropic.APIError) {
      this.logger.error({ status: error.status, requestId: error.requestID }, 'Claude did not read the menu');
      return { status: 'unavailable' };
    }
    if (error instanceof Anthropic.AnthropicError) {
      // The SDK's own: an answer that did not parse against the schema, or a stream cut short.
      this.logger.error({ err: error }, 'Claude answered something that is not a list of products');
      return { status: 'unreadable' };
    }

    throw error;
  }
}
