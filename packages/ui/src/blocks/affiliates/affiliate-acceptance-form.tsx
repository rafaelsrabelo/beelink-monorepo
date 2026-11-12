"use client"

// React
import { useId } from "react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Checkbox } from "@harness-monorepo/ui/components/checkbox"
import { Field, FieldDescription, FieldError, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import { withParts } from "@harness-monorepo/ui/lib/text-parts"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { AffiliateAcceptanceFormValues, AffiliateAcceptanceIssues, AffiliateSlugHint } from "@harness-monorepo/ui/lib/affiliates"
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface AffiliateAcceptanceFormProps {
  /** The account is made here: the name and a password are asked, and bee-link's own terms said. */
  signUp: boolean
  value: AffiliateAcceptanceFormValues
  onChange: (value: AffiliateAcceptanceFormValues) => void
  onSubmit: () => void
  /** What the `/name` field says under it. */
  slugHint: AffiliateSlugHint
  /** The shop wrote terms: the box says they were read; without, that the condition is accepted. */
  hasTerms: boolean
  issues?: AffiliateAcceptanceIssues
  pending?: boolean
  /** Said over the form: the shop changed its terms meanwhile. */
  notice?: string
  /** The API's refusal, in words. */
  error?: string
  termsHref?: string
  privacyHref?: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** Accepting an invite (IMPULSEIA-104): the `/name`, the Pix key, the shop's terms — and the account, when there is none yet. */
export function AffiliateAcceptanceForm({ signUp, value, onChange, onSubmit, slugHint, hasTerms, issues = {}, pending = false, notice, error, termsHref = "/termos", privacyHref = "/privacidade", linkComponent: Link = AnchorLink, messages = defaultMessages }: AffiliateAcceptanceFormProps) {
  const text = messages.affiliateInvite
  const legal = messages.legal
  const id = useId()
  const slugLine = issues.slug ?? (slugHint.kind === "unavailable" ? slugHint.message : null)

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      {notice ? (
        <p role="status" className="bg-warning text-warning-foreground border-warning-foreground/20 rounded-lg border px-3 py-2 text-sm">
          {notice}
        </p>
      ) : null}

      {signUp ? (
        <>
          <Field data-invalid={issues.name ? true : undefined}>
            <FieldLabel htmlFor={`${id}-name`}>{text.name}</FieldLabel>
            <Input id={`${id}-name`} autoComplete="name" value={value.name} disabled={pending} aria-invalid={issues.name ? true : undefined} onChange={(event) => onChange({ ...value, name: event.target.value })} />
            <FieldError>{issues.name}</FieldError>
          </Field>
          <Field data-invalid={issues.password ? true : undefined}>
            <FieldLabel htmlFor={`${id}-password`}>{text.password}</FieldLabel>
            <Input
              id={`${id}-password`}
              type="password"
              autoComplete="new-password"
              value={value.password}
              disabled={pending}
              aria-invalid={issues.password ? true : undefined}
              aria-describedby={`${id}-password-help`}
              onChange={(event) => onChange({ ...value, password: event.target.value })}
            />
            {issues.password ? <FieldError id={`${id}-password-help`}>{issues.password}</FieldError> : <FieldDescription id={`${id}-password-help`}>{text.passwordHelp}</FieldDescription>}
          </Field>
        </>
      ) : null}

      <Field data-invalid={slugLine ? true : undefined}>
        <FieldLabel htmlFor={`${id}-slug`}>{text.slug}</FieldLabel>
        <Input
          id={`${id}-slug`}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          value={value.slug}
          disabled={pending}
          aria-invalid={slugLine ? true : undefined}
          aria-describedby={`${id}-slug-help`}
          onChange={(event) => onChange({ ...value, slug: event.target.value })}
        />
        {/* Polite: it follows the typing, and a screen reader hears it once the person pauses. */}
        <p id={`${id}-slug-help`} aria-live="polite" className={slugLine ? "text-destructive text-sm" : "text-muted-foreground text-sm"}>
          {slugLine ?? (slugHint.kind === "checking" ? text.slugChecking : slugHint.kind === "available" ? `${text.slugAvailable} ${format(text.slugHelp, { link: slugHint.link })}` : "")}
        </p>
      </Field>

      <Field data-invalid={issues.pixKey ? true : undefined}>
        <FieldLabel htmlFor={`${id}-pix`}>{text.pixKey}</FieldLabel>
        <Input
          id={`${id}-pix`}
          autoComplete="off"
          value={value.pixKey}
          disabled={pending}
          aria-invalid={issues.pixKey ? true : undefined}
          aria-describedby={`${id}-pix-help`}
          onChange={(event) => onChange({ ...value, pixKey: event.target.value })}
        />
        {issues.pixKey ? <FieldError id={`${id}-pix-help`}>{issues.pixKey}</FieldError> : <FieldDescription id={`${id}-pix-help`}>{text.pixKeyHelp}</FieldDescription>}
      </Field>

      <Field orientation="horizontal" data-invalid={issues.agreed ? true : undefined}>
        <Checkbox id={`${id}-agreed`} checked={value.agreed} disabled={pending} aria-invalid={issues.agreed ? true : undefined} onCheckedChange={(checked: boolean) => onChange({ ...value, agreed: checked })} />
        <FieldLabel htmlFor={`${id}-agreed`}>{hasTerms ? text.acceptTerms : text.acceptCondition}</FieldLabel>
      </Field>
      {issues.agreed ? <FieldError className="-mt-3">{issues.agreed}</FieldError> : null}

      {error ? (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? text.accepting : signUp ? text.signUp : text.accept}
      </Button>

      {signUp ? (
        <p className="text-muted-foreground text-center text-xs">
          {withParts(legal.signUpNotice, {
            terms: (
              <Link href={termsHref} className="underline underline-offset-4">
                {legal.terms}
              </Link>
            ),
            privacy: (
              <Link href={privacyHref} className="underline underline-offset-4">
                {legal.privacy}
              </Link>
            ),
          })}
        </p>
      ) : null}
    </form>
  )
}
