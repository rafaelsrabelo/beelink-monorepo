"use client"

// React
import { useId, type FormEvent } from "react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@harness-monorepo/ui/components/select"
import { Switch } from "@harness-monorepo/ui/components/switch"
import { ToggleGroup, ToggleGroupItem } from "@harness-monorepo/ui/components/toggle-group"
import type { PopupBenefitChoice, PopupFormIssues, PopupFormValues } from "@harness-monorepo/ui/lib/popup-form"
import { POPUP_BENEFIT_PLACEHOLDER, POPUP_BUTTON_MAX, POPUP_TEXT_MAX, POPUP_TITLE_MAX } from "@harness-monorepo/ui/lib/shop-popup"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { StoreImageField } from "../store/store-image-field"
import { PopupCopyField } from "./popup-copy-field"

export interface PopupFormProps {
  value: PopupFormValues
  onChange: (value: PopupFormValues) => void
  onSubmit: () => void
  issues?: PopupFormIssues
  /** What the pop-up may announce: following the shop first, then each promotion and coupon it may name. */
  choices: readonly PopupBenefitChoice[]
  /** The sentences a visitor reads where a field is left blank, for the benefit as of now: the fields' placeholders. */
  defaults: { title: string; text: string; buttonLabel: string }
  onUploadImage?: (file: File) => Promise<string>
  imagePending?: boolean
  pending?: boolean
  /** The API's refusal, in words. */
  error?: string
  /** The last save went through and nothing was typed since. */
  saved?: boolean
  messages?: UiMessages
}

/** The primitive's pressed grey is lost against the panel's surface; a choice has to read as chosen. */
const PRESSED = "aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
const TRIGGERS = ["ON_ARRIVAL", "ON_LEAVE"] as const satisfies readonly PopupFormValues["trigger"][]

/**
 * The shop's first-purchase pop-up, as its shopkeeper sets it (BEELINK-306): the switch, the
 * picture, the three sentences, what it announces and when it opens. Values are what was typed; the
 * screen reads them, refuses what does not hold field by field, and says why the API refused.
 *
 * A sentence left blank is the default, shown as the field's placeholder — the very words a
 * visitor would read. The number of a discount is never typed: the help says how to name it.
 */
export function PopupForm({ value, onChange, onSubmit, issues = {}, choices, defaults, onUploadImage, imagePending, pending = false, error, saved = false, messages = defaultMessages }: PopupFormProps) {
  const text = messages.discounts.popup
  const id = useId()
  const set = (patch: Partial<PopupFormValues>) => onChange({ ...value, ...patch })
  const triggerLabel = { ON_ARRIVAL: text.triggerArrival, ON_LEAVE: text.triggerLeave } satisfies Record<PopupFormValues["trigger"], string>

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form noValidate onSubmit={submit} aria-label={text.title} className="bg-shell-surface border-shell-border flex flex-col gap-6 rounded-xl border p-4 shadow-xs sm:p-6">
      <Field orientation="horizontal">
        <Switch id={`${id}-enabled`} checked={value.enabled} disabled={pending} aria-describedby={`${id}-enabled-help`} onCheckedChange={(enabled: boolean) => set({ enabled })} />
        <FieldContent>
          <FieldLabel htmlFor={`${id}-enabled`}>{text.enabled}</FieldLabel>
          <FieldDescription id={`${id}-enabled-help`}>{text.enabledHelp}</FieldDescription>
        </FieldContent>
      </Field>

      {/* 800 × 1000 is the card's portrait frame (`StorefrontPopupCard`): the field takes its shape from it. */}
      <StoreImageField
        id={`${id}-image`}
        label={text.image}
        hint={text.imageHelp}
        value={value.imageUrl}
        onChange={(imageUrl) => set({ imageUrl })}
        onUpload={onUploadImage}
        pending={imagePending}
        previewAlt={text.image}
        recommendedSize={{ width: 800, height: 1000 }}
        disabled={pending}
        messages={messages}
      />

      <FieldSet className="flex flex-col gap-4">
        <PopupCopyField id={`${id}-title`} label={text.titleLabel} value={value.title} onChange={(title) => set({ title })} placeholder={defaults.title} max={POPUP_TITLE_MAX} issue={issues.title} disabled={pending} messages={messages} />
        <PopupCopyField id={`${id}-text`} label={text.textLabel} value={value.text} onChange={(next) => set({ text: next })} placeholder={defaults.text} max={POPUP_TEXT_MAX} multiline issue={issues.text} disabled={pending} messages={messages} />
        <PopupCopyField id={`${id}-button`} label={text.buttonLabel} value={value.buttonLabel} onChange={(buttonLabel) => set({ buttonLabel })} placeholder={defaults.buttonLabel} max={POPUP_BUTTON_MAX} issue={issues.buttonLabel} disabled={pending} messages={messages} />
        <FieldDescription>{format(text.copyHelp, { placeholder: POPUP_BENEFIT_PLACEHOLDER })}</FieldDescription>
      </FieldSet>

      <Field>
        <FieldLabel htmlFor={`${id}-benefit`}>{text.benefit}</FieldLabel>
        <Select items={choices} value={value.benefit} onValueChange={(next: string | null) => next && set({ benefit: next })} disabled={pending}>
          <SelectTrigger id={`${id}-benefit`} aria-describedby={`${id}-benefit-help`} className="w-full max-w-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {choices.map((choice) => (
              <SelectItem key={choice.value} value={choice.value}>
                {choice.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldDescription id={`${id}-benefit-help`}>{text.benefitHelp}</FieldDescription>
      </Field>

      <FieldSet className="flex flex-col gap-2">
        <FieldLegend variant="label">{text.trigger}</FieldLegend>
        <ToggleGroup
          value={[value.trigger]}
          // Pressing the chosen one again would leave none; a pop-up always opens by one or the other.
          onValueChange={(next: string[]) => {
            const chosen = TRIGGERS.find((option) => option === next[0])
            if (chosen) set({ trigger: chosen })
          }}
          disabled={pending}
          className="flex-wrap"
        >
          {TRIGGERS.map((option) => (
            <ToggleGroupItem key={option} value={option} variant="outline" className={PRESSED}>
              {triggerLabel[option]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {value.trigger === "ON_ARRIVAL" ? (
          <Field data-invalid={issues.delay ? true : undefined} className="max-w-64">
            <FieldLabel htmlFor={`${id}-delay`}>{text.delay}</FieldLabel>
            <div className="flex items-center gap-2">
              <Input
                id={`${id}-delay`}
                inputMode="numeric"
                placeholder="5"
                value={value.delay}
                disabled={pending}
                aria-invalid={issues.delay ? true : undefined}
                aria-describedby={`${id}-delay-${issues.delay ? "error" : "help"}`}
                onChange={(event) => set({ delay: event.target.value })}
              />
              <span className="text-muted-foreground text-sm">{text.seconds}</span>
            </div>
            {issues.delay ? <FieldError id={`${id}-delay-error`}>{issues.delay}</FieldError> : <FieldDescription id={`${id}-delay-help`}>{text.delayHelp}</FieldDescription>}
          </Field>
        ) : (
          <FieldDescription>{text.triggerLeaveHelp}</FieldDescription>
        )}
        <FieldDescription>{text.where}</FieldDescription>
      </FieldSet>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? text.saving : text.save}
        </Button>
        {/* In the page before there is anything to say, so a reader hears the answer arrive. */}
        <p aria-live="polite" className={error ? "text-destructive text-sm" : "text-muted-foreground text-sm"}>
          {error ?? (saved ? text.saved : null)}
        </p>
      </div>
    </form>
  )
}
