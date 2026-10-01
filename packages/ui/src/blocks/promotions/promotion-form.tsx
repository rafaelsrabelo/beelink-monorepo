"use client"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Field, FieldError, FieldLabel, FieldLegend, FieldSet } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import { ToggleGroup, ToggleGroupItem } from "@harness-monorepo/ui/components/toggle-group"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { halfTypedDates, type DiscountTargetOption, type HalfTypedDates, type PromotionFormIssues, type PromotionFormValues, type PromotionScopeValue } from "@harness-monorepo/ui/lib/discount-form"
import { DiscountPeriodFields } from "./discount-period-fields"
import { DiscountValueFields } from "./discount-value-fields"
import { PromotionCategoryPicker, type PromotionCategoryOption } from "./promotion-category-picker"
import { PromotionProductPicker } from "./promotion-product-picker"

export interface PromotionFormProps {
  value: PromotionFormValues
  onChange: (value: PromotionFormValues) => void
  /** What the catalogue answers for the product search; the screen owns the query. */
  productQuery: string
  onProductQueryChange: (query: string) => void
  productResults: readonly DiscountTargetOption[]
  productsSearching?: boolean
  /** Null while they are read. */
  categories: readonly PromotionCategoryOption[] | null
  /** The read of the categories failed: said so, with the way to ask again. */
  onRetryCategories?: () => void
  issues?: PromotionFormIssues
  /** A refusal of the whole save, already a sentence. */
  error?: string
  /** With which of the two dates the browser holds half-typed: they read as blank, and are not. */
  onSubmit: (halfTyped: HalfTypedDates) => void
  onCancel: () => void
  pending?: boolean
  messages?: UiMessages
}

const SCOPES = ["CART", "PRODUCTS", "CATEGORIES"] as const satisfies readonly PromotionScopeValue[]
const PRESSED = "aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"

/**
 * One promotion as its owner fills it in: what it is called, where it applies — the whole cart, or
 * the products or categories named right under the choice — how much comes off, and for how long.
 *
 * It has no "active" switch: pausing is a button of the list, and a save never moves it.
 */
export function PromotionForm({
  value,
  onChange,
  productQuery,
  onProductQueryChange,
  productResults,
  productsSearching = false,
  categories,
  onRetryCategories,
  issues = {},
  error,
  onSubmit,
  onCancel,
  pending = false,
  messages = defaultMessages,
}: PromotionFormProps) {
  const shared = messages.discounts
  const text = shared.promotions
  const set = (patch: Partial<PromotionFormValues>) => onChange({ ...value, ...patch })
  const scopeLabel: Record<PromotionScopeValue, string> = { CART: text.scopeCart, PRODUCTS: text.scopeProducts, CATEGORIES: text.scopeCategories }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(halfTypedDates(event.currentTarget))
      }}
      className="flex flex-col gap-6"
    >
      <Field data-invalid={issues.name ? true : undefined}>
        <FieldLabel htmlFor="promotion-name">{text.nameLabel}</FieldLabel>
        <Input
          id="promotion-name"
          value={value.name}
          maxLength={80}
          placeholder={text.namePlaceholder}
          disabled={pending}
          aria-invalid={issues.name ? true : undefined}
          aria-describedby={issues.name ? "promotion-name-error" : undefined}
          onChange={(event) => set({ name: event.target.value })}
        />
        <FieldError id="promotion-name-error">{issues.name}</FieldError>
      </Field>

      <FieldSet className="flex flex-col gap-2">
        <FieldLegend variant="label">{text.scopeLabel}</FieldLegend>
        <ToggleGroup
          value={[value.scope]}
          // Pressing the chosen one again would leave none; a promotion always applies somewhere.
          onValueChange={(next: string[]) => {
            const chosen = SCOPES.find((scope) => scope === next[0])
            if (chosen) set({ scope: chosen })
          }}
          disabled={pending}
          className="flex-wrap"
        >
          {SCOPES.map((scope) => (
            <ToggleGroupItem key={scope} value={scope} variant="outline" className={PRESSED}>
              {scopeLabel[scope]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </FieldSet>

      {value.scope === "PRODUCTS" ? (
        <PromotionProductPicker
          query={productQuery}
          onQueryChange={onProductQueryChange}
          results={productResults}
          searching={productsSearching}
          chosen={value.products}
          onChange={(products) => set({ products })}
          issue={issues.products}
          disabled={pending}
          messages={messages}
        />
      ) : null}
      {value.scope === "CATEGORIES" ? (
        <PromotionCategoryPicker categories={categories} onRetry={onRetryCategories} chosenIds={value.categoryIds} onChange={(categoryIds) => set({ categoryIds })} issue={issues.categories} disabled={pending} messages={messages} />
      ) : null}

      <DiscountValueFields
        kinds={[
          { value: "PERCENT", label: shared.kindPercent },
          { value: "FIXED", label: shared.kindFixed },
        ]}
        kind={value.kind}
        percent={value.percent}
        amount={value.amount}
        onChange={set}
        issues={issues}
        amountHelp={value.scope === "CART" ? text.amountCartHelp : text.amountUnitHelp}
        disabled={pending}
        messages={messages}
      />

      <DiscountPeriodFields startsAt={value.startsAt} endsAt={value.endsAt} onChange={set} issues={issues} disabled={pending} messages={messages} />

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {shared.save}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
          {shared.cancel}
        </Button>
      </div>
    </form>
  )
}
