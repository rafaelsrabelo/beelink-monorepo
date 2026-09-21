"use client"

// React
import { useState } from "react"

// Libs
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import type { FieldErrors } from "react-hook-form"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@harness-monorepo/ui/components/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@harness-monorepo/ui/components/tabs"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { StoreAddressFields } from "./store-address-fields"
import { StoreAppearanceFields } from "./store-appearance-fields"
import { StoreIdentityFields } from "./store-identity-fields"
import { StorePaymentMethodsFields } from "./store-payment-methods-fields"
import { createStoreSettingsSchema, type StoreSettingsValues } from "./store-schemas"
import { StoreSocialFields } from "./store-social-fields"
import type {
  StoreAddressSuggestion,
  StoreCategoryOption,
  StoreColorPreset,
  StoreZipCodeAddress,
} from "./store-types"

/** Which tab holds which slice, so a refused save can open the tab that was refused. */
const TAB_OF_SLICE = {
  identity: "identity",
  address: "address",
  social: "social",
  appearance: "appearance",
  paymentMethods: "payment",
} as const satisfies Record<keyof StoreSettingsValues, string>

export interface StoreSettingsFormProps {
  /** The shop's URL segment. Shown by the identity tab, never edited. */
  slug: string
  defaultValues: StoreSettingsValues
  onSubmit: (values: StoreSettingsValues) => void | Promise<void>
  categories: StoreCategoryOption[]
  colorPresets?: StoreColorPreset[]
  /**
   * Asked to fill the address from the postcode, and its answer is used — `void` here is what made
   * the lookup run, resolve, and discard what it found, with no complaint from the compiler.
   */
  onZipCodeLookup?: (zipCode: string) => Promise<StoreZipCodeAddress | null>
  zipCodeLookupPending?: boolean
  /** What is in the street field, for the screen to search with. It debounces; this does not. */
  onAddressSearch?: (query: string) => void
  suggestions?: readonly StoreAddressSuggestion[]
  addressSearchPending?: boolean
  /**
   * Hands one image to whoever keeps bytes and answers with its URL. One callback serves the logo
   * and the banner alike, because one upload endpoint serves both — where the bytes land is the
   * screen's business and never this form's.
   */
  onImageUpload?: (file: File) => Promise<string>
  imageUploadPending?: boolean
  pending?: boolean
  /** A sentence the reader can act on. The screen turns an API errorCode into it. */
  error?: string
  messages?: UiMessages
}

/**
 * Everything the panel edits about a shop, in one form over five tabs and one save — the legacy
 * panel's single "Salvar alterações", and the shape `PUT /stores/:slug` replaces whole. The tabs
 * are panels of this form, not forms of their own: a partial save would clear what another tab holds.
 */
export function StoreSettingsForm({
  slug,
  defaultValues,
  onSubmit,
  categories,
  colorPresets,
  onZipCodeLookup,
  zipCodeLookupPending,
  onAddressSearch,
  suggestions,
  addressSearchPending,
  onImageUpload,
  imageUploadPending,
  pending = false,
  error,
  messages = defaultMessages,
}: StoreSettingsFormProps) {
  const text = messages.store.settings
  const form = useForm<StoreSettingsValues>({
    resolver: zodResolver(createStoreSettingsSchema(messages.validation)),
    defaultValues,
  })
  const errors = form.formState.errors
  const [tab, setTab] = useState<string>(TAB_OF_SLICE.identity)

  // A verdict on a tab nobody is looking at is a form that refuses to save and says nothing. The
  // first refused slice opens instead.
  const openFirstRefusedTab = (refused: FieldErrors<StoreSettingsValues>) => {
    const slices = Object.keys(TAB_OF_SLICE) as Array<keyof StoreSettingsValues>
    const firstRefused = slices.find((slice) => refused[slice])
    if (firstRefused) {
      setTab(TAB_OF_SLICE[firstRefused])
    }
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit, openFirstRefusedTab)}>
      <Card>
        <CardHeader>
          <CardTitle>{text.title}</CardTitle>
          <CardDescription>{text.description}</CardDescription>
          <CardAction>
            <Button type="submit" disabled={pending}>
              {pending ? text.saving : text.save}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {error ? (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full overflow-x-auto">
              <TabsTrigger value="identity">{text.tabIdentity}</TabsTrigger>
              <TabsTrigger value="address">{text.tabAddress}</TabsTrigger>
              <TabsTrigger value="social">{text.tabSocial}</TabsTrigger>
              <TabsTrigger value="appearance">{text.tabAppearance}</TabsTrigger>
              <TabsTrigger value="payment">{text.tabPayment}</TabsTrigger>
            </TabsList>

            <TabsContent value="identity" className="pt-4">
              <Controller
                control={form.control}
                name="identity"
                render={({ field }) => (
                  <StoreIdentityFields
                    value={field.value}
                    onChange={field.onChange}
                    slug={slug}
                    categories={categories}
                    errors={errors.identity}
                    onLogoUpload={onImageUpload}
                    logoUploadPending={imageUploadPending}
                    disabled={pending}
                    messages={messages}
                  />
                )}
              />
            </TabsContent>

            <TabsContent value="address" className="pt-4">
              <Controller
                control={form.control}
                name="address"
                render={({ field }) => (
                  <StoreAddressFields
                    value={field.value}
                    onChange={field.onChange}
                    errors={errors.address}
                    onZipCodeLookup={onZipCodeLookup}
                    lookupPending={zipCodeLookupPending}
                    onAddressSearch={onAddressSearch}
                    suggestions={suggestions}
                    searchPending={addressSearchPending}
                    disabled={pending}
                    messages={messages}
                  />
                )}
              />
            </TabsContent>

            <TabsContent value="social" className="pt-4">
              <Controller
                control={form.control}
                name="social"
                render={({ field }) => (
                  <StoreSocialFields
                    value={field.value}
                    onChange={field.onChange}
                    errors={errors.social}
                    disabled={pending}
                    messages={messages}
                  />
                )}
              />
            </TabsContent>

            <TabsContent value="appearance" className="pt-4">
              <Controller
                control={form.control}
                name="appearance"
                render={({ field }) => (
                  <StoreAppearanceFields
                    value={field.value}
                    onChange={field.onChange}
                    errors={errors.appearance}
                    colorErrors={errors.appearance?.colors}
                    presets={colorPresets}
                    onBannerUpload={onImageUpload}
                    bannerUploadPending={imageUploadPending}
                    disabled={pending}
                    messages={messages}
                  />
                )}
              />
            </TabsContent>

            <TabsContent value="payment" className="pt-4">
              <Controller
                control={form.control}
                name="paymentMethods"
                render={({ field }) => (
                  <StorePaymentMethodsFields
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.paymentMethods}
                    disabled={pending}
                    messages={messages}
                  />
                )}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </form>
  )
}
