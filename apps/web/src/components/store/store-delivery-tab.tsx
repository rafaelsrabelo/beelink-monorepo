"use client"

// React
import { useState } from "react"

// UI
import { DeliverySettingsFailed } from "@harness-monorepo/ui/blocks/delivery/delivery-settings-failed"
import { DeliverySettingsForm } from "@harness-monorepo/ui/blocks/delivery/delivery-settings-form"
import { DeliverySettingsSkeleton } from "@harness-monorepo/ui/blocks/delivery/delivery-settings-skeleton"
import { formatCents } from "@harness-monorepo/ui/blocks/storefront/storefront-price"
import type { DeliverySettingsFormValues, DeliverySettingsIssues } from "@harness-monorepo/ui/lib/delivery"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Types
import type { Store } from "@harness-monorepo/contracts"

// App
import { AppLink } from "@/components/app-link"
import { deliveryCarriersOf, deliveryErrorOf, deliveryFormOf, deliveryPayloadOf, deliveryPreviewsOf, deliveryRadiusOf, pickupAddressOf } from "@/lib/delivery-form"
import { mapTileUrl, pointOf } from "@/services/addresses/map-tiles"
import { useDeliverySettings, useSaveDeliverySettings } from "@/services/delivery/delivery-hooks"
import { DeliveryError } from "@/services/delivery/delivery-requests"
import { useMelhorEnvioConnection } from "@/services/integrations/integration-hooks"
import { melhorEnvioConnectHref } from "@/services/integrations/integration-requests"

export interface StoreDeliveryTabProps {
  store: Store
  locale: string
  messages: UiMessages
}

const NO_ISSUES: DeliverySettingsIssues = {}

/**
 * The store settings' Delivery tab (BEELINK-177): the rules as saved, what is typed until it is
 * saved again, and the Melhor Envio connection the carriers card reads. Its own save — the shop's
 * other tabs are a different route.
 */
export function StoreDeliveryTab({ store, locale, messages }: StoreDeliveryTabProps) {
  const settings = useDeliverySettings(store.slug)
  const connection = useMelhorEnvioConnection(store.slug)
  const save = useSaveDeliverySettings(store.slug)
  const [typed, setTyped] = useState<DeliverySettingsFormValues | null>(null)
  const [issues, setIssues] = useState<DeliverySettingsIssues>(NO_ISSUES)
  const text = messages.delivery

  if (settings.isPending || connection.isPending) return <DeliverySettingsSkeleton messages={messages} />
  if (settings.isError || connection.isError) {
    return <DeliverySettingsFailed onRetry={() => void Promise.all([settings.refetch(), connection.refetch()])} messages={messages} />
  }

  const value = typed ?? deliveryFormOf(settings.data)
  const tileUrl = mapTileUrl()

  function change(next: DeliverySettingsFormValues) {
    if (save.error || save.isSuccess) save.reset()
    setIssues(NO_ISSUES)
    setTyped(next)
  }

  return (
    <DeliverySettingsForm
      value={value}
      onChange={change}
      onSubmit={() => {
        const read = deliveryPayloadOf(value, settings.data, text.issues)
        if ("issues" in read) return setIssues(read.issues)
        save.mutate(read.payload, { onSuccess: () => setTyped(null) })
      }}
      issues={issues}
      previews={deliveryPreviewsOf(value, (cents) => formatCents(cents, locale, "BRL"), text)}
      pickupAddress={pickupAddressOf(store.address)}
      map={tileUrl ? { tileUrl, point: pointOf(store), radiusMeters: deliveryRadiusOf(value) } : null}
      carriers={deliveryCarriersOf(connection.data)}
      connectHref={melhorEnvioConnectHref(store.slug)}
      manageHref={`/admin/${encodeURIComponent(store.slug)}/integrations`}
      linkComponent={AppLink}
      pending={save.isPending}
      error={save.error ? deliveryErrorOf(save.error instanceof DeliveryError ? save.error.errorCode : "UNKNOWN", text.errors) : undefined}
      saved={save.isSuccess}
      messages={messages}
    />
  )
}
