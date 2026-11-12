"use client"

// Libs
import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query"

// Types
import type { AffiliateProgramOverview, AffiliateProgramPayload, CommissionTable, CommissionTablePayload, CommissionTableSummary } from "@harness-monorepo/contracts"

// App
import { affiliateKeys } from "./affiliate-keys"
import {
  createCommissionTable,
  deleteCommissionTable,
  fetchAffiliateProgram,
  fetchCommissionTable,
  saveAffiliateProgram,
  saveCategoryCommission,
  saveProductCommission,
  updateCommissionTable,
} from "./affiliate-requests"

export function useAffiliateProgram(slug: string): UseQueryResult<AffiliateProgramOverview> {
  return useQuery({ queryKey: affiliateKeys.program(slug), queryFn: () => fetchAffiliateProgram(slug) })
}

/** Saved: the answer is the overview as it now stands, written straight into the cache. */
export function useSaveAffiliateProgram(slug: string): UseMutationResult<AffiliateProgramOverview, Error, AffiliateProgramPayload> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: AffiliateProgramPayload) => saveAffiliateProgram(slug, payload),
    onSuccess: (overview) => queryClient.setQueryData(affiliateKeys.program(slug), overview),
  })
}

export function useCommissionTable(slug: string, tableId: string | undefined): UseQueryResult<CommissionTable> {
  return useQuery({ queryKey: affiliateKeys.table(slug, tableId ?? ""), queryFn: () => fetchCommissionTable(slug, tableId ?? ""), enabled: Boolean(tableId) })
}

/** A table written or removed: the list and its counts are the programme's read, so it is read again. */
function useTableMutation<V, R>(slug: string, run: (variables: V) => Promise<R>): UseMutationResult<R, Error, V> {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: run, onSuccess: () => queryClient.invalidateQueries({ queryKey: affiliateKeys.shop(slug) }) })
}

export function useCreateCommissionTable(slug: string): UseMutationResult<CommissionTable, Error, CommissionTablePayload> {
  return useTableMutation(slug, (payload: CommissionTablePayload) => createCommissionTable(slug, payload))
}

export function useUpdateCommissionTable(slug: string): UseMutationResult<CommissionTable, Error, { tableId: string; payload: CommissionTablePayload }> {
  return useTableMutation(slug, ({ tableId, payload }: { tableId: string; payload: CommissionTablePayload }) => updateCommissionTable(slug, tableId, payload))
}

export function useDeleteCommissionTable(slug: string): UseMutationResult<void, Error, string> {
  return useTableMutation(slug, (tableId: string) => deleteCommissionTable(slug, tableId))
}

export function useSaveCategoryCommission(slug: string): UseMutationResult<unknown, Error, { tableId: string; categoryId: string; rateBps: number | null }> {
  return useTableMutation(slug, ({ tableId, categoryId, rateBps }: { tableId: string; categoryId: string; rateBps: number | null }) => saveCategoryCommission(slug, tableId, categoryId, rateBps))
}

export function useSaveProductCommission(slug: string): UseMutationResult<unknown, Error, { tableId: string; productId: string; rateBps: number | null }> {
  return useTableMutation(slug, ({ tableId, productId, rateBps }: { tableId: string; productId: string; rateBps: number | null }) => saveProductCommission(slug, tableId, productId, rateBps))
}

/**
 * The default table, while the shop's programme is on (IMPULSEIA-102): what makes the products'
 * screens ask and list each product's commission. Undefined until both are read, or with the
 * programme off — a field that appears is kinder than one that vanishes.
 */
export function useDefaultCommissionTable(slug: string): {
  table: CommissionTable | undefined
  summary: CommissionTableSummary | undefined
  /** Each product's own rate on it, by product; undefined until it is read. */
  rates: ReadonlyMap<string, number> | undefined
  /** Each category's own rate on it, by category (the user's review, 12/11/2026); undefined until it is read. */
  categoryRates: ReadonlyMap<string, number> | undefined
  pending: boolean
} {
  const overview = useAffiliateProgram(slug)
  const summary = overview.data?.program.enabled ? overview.data.tables.find((candidate) => candidate.isDefault) : undefined
  const detail = useCommissionTable(slug, summary?.id)
  const table = summary ? detail.data : undefined
  return {
    table,
    summary,
    rates: table ? new Map(table.rates.map((rate) => [rate.productId, rate.rateBps])) : undefined,
    categoryRates: table ? new Map(table.categoryRates.map((rate) => [rate.categoryId, rate.rateBps])) : undefined,
    pending: overview.isPending || (summary !== undefined && detail.isPending),
  }
}
