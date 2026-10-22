"use client"

// Libs
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query"

// Types
import type {
  ChangeStoreSlugPayload,
  CreateStorePayload,
  Store,
  StoreCategory,
  StoreColorPreset,
  StoreColors,
  StoreSlugAvailability,
  UpdateStorePayload,
} from "@harness-monorepo/contracts"

// App
import { customerKeys } from "../customers/customer-hooks"
import {
  changeStoreSlug,
  createStore,
  fetchMyStores,
  fetchStore,
  fetchStoreCategories,
  fetchStoreColorPresets,
  fetchStoreSlugAvailability,
  updateStore,
  updateStoreColors,
} from "./store-requests"

/**
 * Keys are built from their inputs at call time, never spelled out at a call site
 * (docs/ai-rules/state-and-data.md): invalidating `all` reaches every shop's entry, and
 * invalidating `detail(slug)` reaches exactly one.
 */
export const storeKeys = {
  all: ["stores"] as const,
  mine: () => [...storeKeys.all, "mine"] as const,
  detail: (slug: string) => [...storeKeys.all, "detail", slug] as const,
  categories: () => [...storeKeys.all, "categories"] as const,
  colorPresets: () => [...storeKeys.all, "color-presets"] as const,
  slugAvailability: (slug: string, candidate: string) => [...storeKeys.all, "slug-availability", slug, candidate] as const,
}

/** An address asked about a moment ago is not asked again while it is typed back and forth. */
const SLUG_AVAILABILITY_STALE_TIME = 10 * 1000

/** Reference data both forms need before they can render: the taxonomy and the palettes. */
const REFERENCE_DATA_STALE_TIME = 5 * 60 * 1000

export function useMyStores(): UseQueryResult<Store[], Error> {
  return useQuery({ queryKey: storeKeys.mine(), queryFn: fetchMyStores })
}

export function useStore(slug: string): UseQueryResult<Store, Error> {
  return useQuery({
    queryKey: storeKeys.detail(slug),
    queryFn: () => fetchStore(slug),
    // Without this the shell fires `fetchStore("")` on every page that is not inside a shop —
    // a 404 per navigation, and a query key of `["stores","detail",""]` caching the refusal.
    enabled: slug !== "",
  })
}

/**
 * The platform seeds this list and a shopkeeper never edits it, so it is worth keeping for the
 * length of a visit rather than re-reading it on every tab change.
 */
export function useStoreCategories(): UseQueryResult<StoreCategory[], Error> {
  return useQuery({
    queryKey: storeKeys.categories(),
    queryFn: fetchStoreCategories,
    staleTime: REFERENCE_DATA_STALE_TIME,
  })
}

/**
 * The six named palettes. A constant on the API rather than a table, so it changes only on a
 * deploy — and the create form cannot render without it, because the colours a new shop opens
 * with are the first palette's and this workspace is not allowed to hold a colour of its own.
 */
export function useStoreColorPresets(): UseQueryResult<StoreColorPreset[], Error> {
  return useQuery({
    queryKey: storeKeys.colorPresets(),
    queryFn: fetchStoreColorPresets,
    staleTime: REFERENCE_DATA_STALE_TIME,
  })
}

export function useCreateStore(): UseMutationResult<Store, Error, CreateStorePayload> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createStore,
    onSuccess: async (store) => {
      queryClient.setQueryData(storeKeys.detail(store.slug), store)
      await queryClient.invalidateQueries({ queryKey: storeKeys.mine() })
    },
  })
}

/**
 * The slug is bound here and not sent as a variable: a page's address changes by its own route
 * alone (`useChangeStoreSlug`), so a form that could carry a different one would be offering an edit
 * the API refuses.
 */
export function useUpdateStoreColors(slug: string): UseMutationResult<Store, Error, StoreColors> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (colors: StoreColors) => updateStoreColors(slug, colors),
    onSuccess: async (store) => {
      queryClient.setQueryData(storeKeys.detail(slug), store)
      await queryClient.invalidateQueries({ queryKey: storeKeys.mine() })
    },
  })
}

/**
 * The customers are read again too: their stage is worked out from the shop's "inativo depois de
 * N dias", which this form sets, so a cached list would keep the old badges for a minute.
 */
export function useUpdateStore(slug: string): UseMutationResult<Store, Error, UpdateStorePayload> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateStorePayload) => updateStore(slug, payload),
    onSuccess: async (store) => {
      queryClient.setQueryData(storeKeys.detail(slug), store)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: storeKeys.mine() }),
        queryClient.invalidateQueries({ queryKey: customerKeys.store(slug) }),
      ])
    },
  })
}

/**
 * Whether an address may be the page's new one (BEELINK-331): asked once it is typed — the screen
 * waits for a pause — and never for nothing. A warning only: the change asks again.
 */
export function useStoreSlugAvailability(slug: string, candidate: string): UseQueryResult<StoreSlugAvailability, Error> {
  return useQuery({
    queryKey: storeKeys.slugAvailability(slug, candidate),
    queryFn: () => fetchStoreSlugAvailability(slug, candidate),
    enabled: slug !== "" && candidate !== "",
    staleTime: SLUG_AVAILABILITY_STALE_TIME,
    retry: false,
  })
}

/**
 * The page's new address (BEELINK-331). The page is kept under the new address's key, and the list
 * of pages is read again — the switch names the page by its address. What was kept under the old one
 * is left to go stale: the screen leaves that address at once.
 */
export function useChangeStoreSlug(slug: string): UseMutationResult<Store, Error, ChangeStoreSlugPayload> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: ChangeStoreSlugPayload) => changeStoreSlug(slug, payload),
    onSuccess: async (store) => {
      queryClient.setQueryData(storeKeys.detail(store.slug), store)
      await queryClient.invalidateQueries({ queryKey: storeKeys.mine() })
    },
  })
}
