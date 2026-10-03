"use client"

// React
import { useState } from "react"

// Libs
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import type { FieldErrors } from "react-hook-form"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Card, CardContent } from "@harness-monorepo/ui/components/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@harness-monorepo/ui/components/tabs"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { StoreAddressFields } from "./store-address-fields"
import { StoreCustomersFields } from "./store-customers-fields"
import { StoreIdentityFields } from "./store-identity-fields"
import { StorePaymentMethodsFields } from "./store-payment-methods-fields"
import type { StoreSettingsFormProps } from "./store-settings-form.types"
import { createStoreSettingsSchema, type StoreSettingsValues } from "./store-schemas"
import { StoreSocialFields } from "./store-social-fields"

/** Which tab holds which slice, so a refused save can open the tab that was refused. */
const TAB_OF_SLICE = {
  identity: "identity",
  address: "address",
  social: "social",
  paymentMethods: "payment",
  customers: "customers",
} as const satisfies Record<keyof StoreSettingsValues, string>

export type { StoreSettingsExtraTab, StoreSettingsFormProps } from "./store-settings-form.types"

/**
 * Everything the panel edits about a shop, in one form over five tabs and one save — the legacy
 * panel's single "Salvar alterações", and the shape `PUT /stores/:slug` replaces whole. The tabs
 * are panels of this form, not forms of their own: a partial save would clear what another tab holds.
 *
 * `extraTabs` sit in the same row and save through their own route (BEELINK-177): they are drawn
 * outside this `<form>`, because a form inside a form is invalid HTML and its submit would post both.
 * The look of the shop is design mode's, not a tab here.
 */
export function StoreSettingsForm({
  slug,
  defaultValues,
  onSubmit,
  categories,
  onZipCodeLookup,
  zipCodeLookupPending,
  onAddressSearch,
  suggestions,
  addressSearchPending,
  onPointChange,
  point,
  mapTileUrl,
  onImageUpload,
  imageUploadPending,
  pending = false,
  error,
  extraTabs = [],
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

  const onStoreTab = !extraTabs.some((extra) => extra.value === tab)

  return (
    <div className="flex w-full flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{text.title}</h1>
        <p className="text-sm text-muted-foreground">{text.description}</p>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        {/*
          Scrolls sideways on a narrow screen, with no bar: a classic scrollbar takes its height out of
          the row and cuts the tabs, and `overflow-x-auto` turns the other axis to auto as well — the
          row's content measures a pixel taller than the row, a thumb beside the last tab on a wide one.
        */}
        <TabsList className="no-scrollbar w-full justify-start overflow-x-auto">
          <TabsTrigger value="identity">{text.tabIdentity}</TabsTrigger>
          <TabsTrigger value="address">{text.tabAddress}</TabsTrigger>
          <TabsTrigger value="social">{text.tabSocial}</TabsTrigger>
          <TabsTrigger value="payment">{text.tabPayment}</TabsTrigger>
          <TabsTrigger value="customers">{text.tabCustomers}</TabsTrigger>
          {extraTabs.map((extra) => (
            <TabsTrigger key={extra.value} value={extra.value}>
              {extra.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <form noValidate hidden={!onStoreTab} onSubmit={form.handleSubmit(onSubmit, openFirstRefusedTab)}>
          <Card>
            <CardContent className="flex flex-col gap-6">
              {error ? (
                <p
                  role="alert"
                  className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {error}
                </p>
              ) : null}

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
                    onPointChange={onPointChange}
                    point={point}
                    mapTileUrl={mapTileUrl}
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

            <TabsContent value="customers" className="pt-4">
              <Controller
                control={form.control}
                name="customers"
                render={({ field }) => (
                  <StoreCustomersFields
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.customers?.inactiveAfterDays}
                    disabled={pending}
                    messages={messages}
                  />
                )}
              />
            </TabsContent>
            </CardContent>
          </Card>

          {/*
            The same foot the create form grew, for the same reason: a save button beside the title is
            beside nothing it saves. Outside the Card: `Card` is `overflow-hidden`, and a clipping
            ancestor turns `position: sticky` into `position: static` with nothing in the DOM to say why.
          */}
          <div className="sticky bottom-0 mt-4 flex items-center justify-end gap-3 rounded-lg border border-border bg-card px-6 py-4 shadow-sm">
            <Button type="submit" disabled={pending}>
              {pending ? text.saving : text.save}
            </Button>
          </div>
        </form>

        {extraTabs.map((extra) => (
          <TabsContent key={extra.value} value={extra.value}>
            {extra.content}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
