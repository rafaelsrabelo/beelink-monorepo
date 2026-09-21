"use client"

// React
import { useState } from "react"

// Libs
import { zodResolver } from "@hookform/resolvers/zod"
import { CircleAlertIcon } from "lucide-react"
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
import { StoreColorsFields } from "./store-colors-fields"
import { StoreIdentityFields } from "./store-identity-fields"
import { createStoreCreateSchema, type StoreCreateValues } from "./store-schemas"
import { slugify } from "./store-slug"
import { StoreSocialFields } from "./store-social-fields"
import type { StoreCategoryOption, StoreColorPreset, StoreZipCodeAddress } from "./store-types"

/** Which tab holds which slice. The slug sits with the identity it is derived from. */
const TAB_OF_SLICE = {
  slug: "identity",
  identity: "identity",
  address: "address",
  social: "social",
  colors: "appearance",
} as const satisfies Record<keyof StoreCreateValues, string>

export interface StoreCreateFormProps {
  /** The shop before anything is typed. The colours come with it: this package ships none. */
  defaultValues: StoreCreateValues
  onSubmit: (values: StoreCreateValues) => void | Promise<void>
  categories: StoreCategoryOption[]
  colorPresets?: StoreColorPreset[]
  /**
   * Asked to fill the address from the postcode, and its answer is used — `void` here is what made
   * the lookup run, resolve, and discard what it found, with no complaint from the compiler.
   */
  onZipCodeLookup?: (zipCode: string) => Promise<StoreZipCodeAddress | null>
  zipCodeLookupPending?: boolean
  /** One callback for every image, as in the settings form — one upload endpoint serves both. */
  onImageUpload?: (file: File) => Promise<string>
  imageUploadPending?: boolean
  pending?: boolean
  /** A sentence the reader can act on. The screen turns an API errorCode into it. */
  error?: string
  messages?: UiMessages
}

/**
 * Opening a shop, over the same tabs and the same field blocks the settings form edits it with.
 *
 * Two things this form does that the settings form cannot. The slug is editable — it is set exactly
 * once — and is proposed from the name until the shopkeeper touches it, so a shop whose address is
 * taken is renamed rather than abandoned. And every tab says whether it is holding a refused field:
 * a create submitted from the first tab that fails on the fourth otherwise refuses in silence.
 */
export function StoreCreateForm({
  defaultValues,
  onSubmit,
  categories,
  colorPresets,
  onZipCodeLookup,
  zipCodeLookupPending,
  onImageUpload,
  imageUploadPending,
  pending = false,
  error,
  messages = defaultMessages,
}: StoreCreateFormProps) {
  const text = messages.store.create
  const form = useForm<StoreCreateValues>({
    resolver: zodResolver(createStoreCreateSchema(messages.validation)),
    defaultValues,
  })
  const errors = form.formState.errors
  const [tab, setTab] = useState<string>(TAB_OF_SLICE.identity)
  const [slugTouched, setSlugTouched] = useState(false)

  const slices = Object.keys(TAB_OF_SLICE) as Array<keyof StoreCreateValues>
  const refusedTabs = new Set<string>(
    slices.filter((slice) => errors[slice]).map((slice) => TAB_OF_SLICE[slice]),
  )

  // A verdict on a tab nobody is looking at is a form that refuses to save and says nothing.
  const openFirstRefusedTab = (refused: FieldErrors<StoreCreateValues>) => {
    const firstRefused = slices.find((slice) => refused[slice])
    if (firstRefused) {
      setTab(TAB_OF_SLICE[firstRefused])
    }
  }

  const tabs = [
    { value: "identity", label: text.tabIdentity },
    { value: "address", label: text.tabAddress },
    { value: "social", label: text.tabSocial },
    { value: "appearance", label: text.tabAppearance },
  ]

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit, openFirstRefusedTab)}>
      <Card>
        <CardHeader>
          <CardTitle>{text.title}</CardTitle>
          <CardDescription>{text.description}</CardDescription>
          <CardAction>
            <Button type="submit" disabled={pending}>
              {pending ? text.submitting : text.submit}
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
              {tabs.map((entry) => (
                <TabsTrigger key={entry.value} value={entry.value}>
                  {entry.label}
                  {refusedTabs.has(entry.value) ? (
                    <>
                      <CircleAlertIcon aria-hidden="true" className="text-destructive" />
                      {/* A coloured dot alone is not a verdict — rule out colour as the only cue. */}
                      <span className="sr-only">{text.tabHasError}</span>
                    </>
                  ) : null}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="identity" className="pt-4">
              <Controller
                control={form.control}
                name="slug"
                render={({ field: slugField }) => (
                  <Controller
                    control={form.control}
                    name="identity"
                    render={({ field }) => (
                      <StoreIdentityFields
                        value={field.value}
                        slug={slugField.value}
                        slugError={errors.slug}
                        categories={categories}
                        errors={errors.identity}
                        onLogoUpload={onImageUpload}
                        logoUploadPending={imageUploadPending}
                        disabled={pending}
                        messages={messages}
                        onSlugChange={(slug) => {
                          setSlugTouched(true)
                          slugField.onChange(slug)
                        }}
                        onChange={(identity) => {
                          field.onChange(identity)
                          if (!slugTouched) {
                            slugField.onChange(slugify(identity.name))
                          }
                        }}
                      />
                    )}
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
                name="colors"
                render={({ field }) => (
                  <StoreColorsFields
                    value={field.value}
                    onChange={field.onChange}
                    errors={errors.colors}
                    presets={colorPresets}
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
