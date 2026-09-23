/* ── leads: what arrives through a site's contact form ────────────────────── */

// Types
import type { ContactFieldType } from "./page.js";

/**
 * Where a lead stands with the owner. Four values and no fifth: a pipeline a shopkeeper can read
 * off a select, not a CRM.
 */
export type LeadStatus = "NEW" | "CONTACTED" | "WON" | "LOST";

/**
 * One answer, with the question it answered captured at the time.
 *
 * The label and the type travel with the value rather than being looked up on the form, because
 * the form is the owner's to change: a field renamed or deleted after the fact must not make an
 * older lead unreadable. `fieldId` is kept so the panel can still say which field it was while
 * that field exists.
 */
export interface LeadAnswer {
  fieldId: string;
  label: string;
  type: ContactFieldType;
  value: string;
}

/**
 * A lead as its owner reads it.
 *
 * `name`, `email` and `phone` are columns because they are what the list shows and what the owner
 * uses to answer: the first answer of type `EMAIL` and the first of type `PHONE`, lifted out.
 * Everything else the form asked — company, volume, a date — is in `answers`. There is no
 * `company` column: nothing filters by it, and a column nobody reads is the `layoutSettings`
 * disease.
 */
export interface Lead {
  id: string;
  /** The form it came through. Null once that form was deleted: the lead outlives the block. */
  componentId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  answers: LeadAnswer[];
  status: LeadStatus;
  /** ISO-8601. */
  createdAt: string;
  updatedAt: string;
}

/** One page of a site's leads, newest first. Echoes the bounds that were used, not the ones asked. */
export interface LeadPage {
  leads: Lead[];
  total: number;
  page: number;
  pageSize: number;
}

export interface LeadListQuery {
  status?: LeadStatus;
  page?: number;
  pageSize?: number;
}

/**
 * What a visitor sends. Anonymous, rate-limited per address.
 *
 * `answers` is keyed by the form's field ids and checked against the fields that form declares:
 * a required one that is missing, a value of the wrong shape, or a key the form does not have is
 * refused with `LEAD_ANSWER_INVALID`.
 *
 * `website` is the trap. The form draws it out of sight and no person fills it in; a body that
 * carries one is answered as if it were saved and is not — a robot shown success does not retry.
 */
export interface CreateLeadPayload {
  componentId: string;
  name: string;
  answers: Record<string, string>;
  website?: string;
}

export interface UpdateLeadPayload {
  status: LeadStatus;
}

/** The `errorCode` values the leads module answers. The apps own the sentences. */
export type LeadErrorCode =
  | "LEAD_NOT_FOUND"
  /** No active contact form with that id on that site. */
  | "LEAD_FORM_NOT_FOUND"
  /** An answer does not fit what the form asked. The message names the field. */
  | "LEAD_ANSWER_INVALID";
