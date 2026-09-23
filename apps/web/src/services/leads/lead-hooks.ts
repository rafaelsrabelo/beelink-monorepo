"use client"

// Libs
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query"

// Types
import type { CreateLeadPayload, Lead, LeadListQuery, LeadPage, LeadStatus } from "@harness-monorepo/contracts"

// App
import { deleteLead, fetchLeads, sendLead, updateLeadStatus } from "./lead-requests"

/** Built from their inputs, never spelled at a call site (docs/ai-rules/state-and-data.md). */
export const leadKeys = {
  all: ["leads"] as const,
  site: (slug: string) => [...leadKeys.all, slug] as const,
  list: (slug: string, query: LeadListQuery) => [...leadKeys.site(slug), "list", query] as const,
}

export function useLeads(slug: string, query: LeadListQuery = {}): UseQueryResult<LeadPage, Error> {
  return useQuery({
    queryKey: leadKeys.list(slug, query),
    queryFn: () => fetchLeads(slug, query),
    enabled: slug !== "",
    placeholderData: (previous) => previous,
  })
}

export interface LeadStatusVariables {
  leadId: string
  status: LeadStatus
}

export function useUpdateLeadStatus(slug: string): UseMutationResult<Lead, Error, LeadStatusVariables> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ leadId, status }: LeadStatusVariables) => updateLeadStatus(slug, leadId, status),
    // Every page of the list: a status filter is on screen, and the row may have to leave it.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: leadKeys.site(slug) }),
  })
}

export function useDeleteLead(slug: string): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (leadId: string) => deleteLead(slug, leadId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: leadKeys.site(slug) }),
  })
}

/** The visitor's side. A mutation and nothing cached: the answer is yes or no. */
export function useSendLead(slug: string): UseMutationResult<void, Error, CreateLeadPayload> {
  return useMutation({ mutationFn: (payload: CreateLeadPayload) => sendLead(slug, payload) })
}
